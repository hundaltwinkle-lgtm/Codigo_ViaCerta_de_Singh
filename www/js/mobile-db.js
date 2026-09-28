/* =====================================================================
   mobile-db.js — ponte da base de dados para a versão móvel (Capacitor)
   ---------------------------------------------------------------------
   Contrato (espelha o preload.js do Electron, mas async):
     window.db.exec(sql, 'get'|'run') -> Promise
       'get' : devolve Array de linhas como OBJETOS NORMAIS
               ({} com prototype Object) — NUNCA objetos null-prototype
               (partem a coerção do código legado: r.campo, ==, etc.).
               SQL com vários statements separados por ';' é executado
               sequencialmente.
       'run' : executa o(s) statement(s) de escrita; devolve undefined.
     window.db.flush()               -> força a persistência imediata.
     window.dbReady()                -> Promise da inicialização.
   Persistência:
     - A BD bundled vive em assets/db/segurancarodoviaria.db.
     - No Capacitor (Android): a 1.ª execução copia os bytes para
       sr-db/segurancarodoviaria.db (Filesystem, diretório de dados da
       app); as execuções seguintes carregam a partir daí.
     - Escritas: aplicam-se logo na BD em memória; a persistência é
       debounced (>= 1500 ms após a última escrita) com db.export() ->
       ficheiro .tmp -> rename() (atómico) via Capacitor Filesystem.
     - Sem Capacitor (browser plano / testes http): persistência via
       IndexedDB (as páginas navegam entre si e a BD tem de sobreviver);
       sem IndexedDB, só em memória, com console.warn.
   Arranque:
     - window.db só fica definido DEPOIS da inicialização terminar
       (as páginas fazem poll de typeof window.db).
     - window.dbReady() devolve a Promise da inicialização.
   Testes em Node: definir window.__SR_MOBILE_LIB__ = caminho absoluto
   para www/lib antes de avaliar este ficheiro (usa-se para o locateFile
   do sql.js). fetch() tem de servir assets/db/segurancarodoviaria.db e
   lib/sql-wasm.wasm (ou usar ficheiros reais via stub).
   ===================================================================== */
(function () {
  'use strict';

  var DB_URL = 'assets/db/segurancarodoviaria.db';
  var LIB_BASE = (typeof window.__SR_MOBILE_LIB__ === 'string' && window.__SR_MOBILE_LIB__)
    ? window.__SR_MOBILE_LIB__
    : 'lib/';
  var FS_DIR = 'sr-db';
  var FS_MAIN = FS_DIR + '/segurancarodoviaria.db';
  var FS_TMP = FS_DIR + '/segurancarodoviaria.db.tmp';
  var PERSIST_DEBOUNCE_MS = 1500;

  /* ----------------------------------------------------------------
     Utilidades de bytes <-> base64 (o Capacitor Filesystem nativo só
     aceita base64 para binário; 'bytes' não existe como Encoding).
     btoa/atob existem no browser e no Node >= 16.
  ---------------------------------------------------------------- */
  function bytesToBase64(bytes) {
    var binary = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  function base64ToBytes(b64) {
    var binary = atob(String(b64));
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  /* Converte o resultado de Filesystem.readFile (base64 em nativo,
     ArrayBuffer/Uint8Array/Blob em web) em Uint8Array. */
  function copyToBytes(data) {
    if (data == null) return null;
    if (typeof ArrayBuffer !== 'undefined' &&
        (data instanceof ArrayBuffer ||
         (typeof SharedArrayBuffer !== 'undefined' && data instanceof SharedArrayBuffer))) {
      return new Uint8Array(data);
    }
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    if (data instanceof Blob) return null; /* Blob só existe na web; não tratamos aqui */
    if (typeof data === 'string') {
      try { return base64ToBytes(data); } catch (e) { return null; }
    }
    return null;
  }

  /* ----------------------------------------------------------------
     Deteção do plugin Capacitor Filesystem
  ---------------------------------------------------------------- */
  function fsPlugin() {
    try {
      if (typeof window.Capacitor === 'undefined' || !window.Capacitor) return null;
      if (typeof window.Capacitor.isNativePlatform === 'function') {
        if (!window.Capacitor.isNativePlatform()) return null;
      }
      var p = window.Capacitor.Plugins;
      if (!p || !p.Filesystem || typeof p.Filesystem.writeFile !== 'function') return null;
      return p.Filesystem;
    } catch (e) {
      return null;
    }
  }

  async function fsEnsureDir(fs) {
    try {
      await fs.mkdir({ path: FS_DIR, recursive: true });
    } catch (e) { /* já existe em alguns builds — não é fatal */ }
  }

  async function fsExists(fs, path) {
    try {
      await fs.stat({ path: path });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function fsReadBytes(fs, path) {
    var res = await fs.readFile({ path: path });
    var bytes = copyToBytes(res && res.data);
    if (!bytes) throw new Error('readFile devolveu um formato inesperado');
    return bytes;
  }

  async function fsWriteBytes(fs, path, bytes) {
    /* nativo: binário = string base64 sem encoding (ver docs @capacitor/filesystem) */
    await fs.writeFile({ path: path, data: bytesToBase64(bytes), recursive: true });
  }

  /* Escreve no .tmp e renomeia (atómico). Se rename() não estiver
     disponível nesta versão do plugin, escreve diretamente. */
  async function fsWritePersistent(fs, bytes) {
    await fsWriteBytes(fs, FS_TMP, bytes);
    try {
      if (typeof fs.rename === 'function') {
        await fs.rename({ from: FS_TMP, to: FS_MAIN });
      } else {
        await fsWriteBytes(fs, FS_MAIN, bytes);
      }
    } catch (e) {
      await fsWriteBytes(fs, FS_MAIN, bytes);
    }
  }

  /* ----------------------------------------------------------------
     Persistência IndexedDB (browser plano — alternativa ao Filesystem)
     Mesma estratégia: gravar bytes exportados da BD, atomicamente.
  ---------------------------------------------------------------- */
  var IDB_NAME = 'sr_mobile';
  var IDB_STORE = 'db';
  var IDB_KEY = 'segurancarodoviaria';

  function idbAvailable() {
    return typeof indexedDB !== 'undefined' && indexedDB != null;
  }

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IDB open falhou')); };
    });
  }

  function idbDelete() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.deleteDatabase(IDB_NAME);
        req.onsuccess = req.onerror = req.onblocked = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }

  async function idbLoad() {
    var db = await idbOpen();
    try {
      return await new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = function () {
          var v = req.result;
          if (!v) return resolve(null);
          if (v instanceof ArrayBuffer) return resolve(new Uint8Array(v));
          if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(v)) {
            return resolve(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
          }
          resolve(null);
        };
        req.onerror = function () { reject(req.error || new Error('IDB load falhou')); };
      });
    } finally {
      try { db.close(); } catch (e5) { /* já fechada */ }
    }
  }

  async function idbSave(bytes, forceCommit) {
    var db = await idbOpen();
    try {
      var copy = bytes.slice().buffer; /* cópia exata — nunca partilhar o buffer vivo */
      var tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(copy, IDB_KEY);
      if (forceCommit && typeof tx.commit === 'function') tx.commit();
      await new Promise(function (resolve, reject) {
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error || new Error('IDB write falhou')); };
        tx.onabort = function () { reject(tx.error || new Error('IDB abort')); };
      });
    } finally {
      try { db.close(); } catch (e6) { /* já fechada */ }
    }
  }

  /* ----------------------------------------------------------------
     Execução de SQL
  ---------------------------------------------------------------- */

  /* Divide um SQL em statements, respeitando literais '...', "...", `...`
     e o escape SQLite '' / "". */
  function splitStatements(sql) {
    var out = [];
    var cur = '';
    var i = 0;
    var n = sql.length;
    var q = null;
    while (i < n) {
      var ch = sql.charAt(i);
      if (q) {
        cur += ch;
        if (ch === q) {
          if (sql.charAt(i + 1) === q) { cur += q; i++; }
          else q = null;
        }
      } else if (ch === ';') {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
      } else if (ch === "'" || ch === '"' || ch === '`') {
        q = ch;
        cur += ch;
      } else {
        cur += ch;
      }
      i++;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function queryRows(database, sql) {
    var rows = [];
    var stmts = splitStatements(sql);
    for (var s = 0; s < stmts.length; s++) {
      var stmt = database.prepare(stmts[s]);
      try {
        var names = stmt.getColumnNames();
        while (stmt.step()) {
          var values = stmt.get(); /* sql.js 1.x: array com TODOS os valores da linha */
          /* objeto NORMAL ({}), nunca null-prototype */
          var row = {};
          for (var c = 0; c < names.length; c++) {
            row[names[c]] = (values && c < values.length) ? values[c] : null;
          }
          rows.push(row);
        }
      } finally {
        /* sql.js 1.x: o método de libertação é free() (finalize não existe) */
        try { if (typeof stmt.free === 'function') stmt.free(); else stmt.finalize(); } catch (e2) { /* já libertado */ }
      }
    }
    return rows;
  }

  /* ----------------------------------------------------------------
     Persistência debounced
  ---------------------------------------------------------------- */
  var dirty = false;
  var persistTimer = null;
  var txDepth = 0; /* transações BEGIN/COMMIT explícitas — export() destrói uma txn aberta em sql.js */

  function countTxStatements(sql) {
    /* conta BEGIN..TRANSACTION vs COMMIT/ROLLBACK num SQL (pode ter vários) */
    var stmts = splitStatements(sql);
    var depth = 0;
    for (var i = 0; i < stmts.length; i++) {
      var s = stmts[i].replace(/\s+/g, ' ').trim();
      if (/^(BEGIN\b|BEGIN\s+(DEFERRED|IMMEDIATE|EXCLUSIVE)\s+TRANSACTION)/i.test(s)) depth++;
      else if (/^(COMMIT|END|ROLLBACK)\b/i.test(s)) depth = Math.max(0, depth - 1);
    }
    return depth;
  }

  function markDirty() {
    dirty = true;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(runPersist, PERSIST_DEBOUNCE_MS);
  }

  async function runPersist() {
    persistTimer = null;
    if (!dirty || !database) return;
    if (txDepth > 0) {
      /* transação aberta: export() em sql.js destrói a transação (erro
         'cannot commit — no transaction is active'). Adiar. */
      persistTimer = setTimeout(runPersist, 500);
      return;
    }
    dirty = false;
    try {
      var bytes = database.export();
      var fs = fsPlugin();
      if (fs) {
        await fsEnsureDir(fs);
        await fsWritePersistent(fs, bytes);
        console.log('[mobile-db] Base de dados persistida em ' + FS_MAIN);
      } else if (idbAvailable()) {
        await idbSave(bytes);
        console.log('[mobile-db] Base de dados persistida em IndexedDB (browser).');
      } else {
        /* sem Capacitor nem IndexedDB — só em memória; aviso único no arranque */
        console.warn('[mobile-db] Persistência indisponível; alterações só em memória.');
      }
    } catch (e) {
      console.warn('[mobile-db] Falha ao persistir a base de dados:', e && e.message || e);
      dirty = true; /* tenta novamente na próxima janela */
    }
  }

  async function flush() {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    if (dirty) await runPersist();
  }

  try {
    window.addEventListener('beforeunload', function () {
      if (dirty && database) {
        try {
          if (persistTimer) clearTimeout(persistTimer);
          persistTimer = null;
          runPersist(); /* best effort; a escrita pode ou não concluir */
        } catch (e2) { /* ignorar */ }
      }
    });
  } catch (e3) { /* sem window.addEventListener (Node) */ }

  /* ----------------------------------------------------------------
     Inicialização
  ---------------------------------------------------------------- */
  var database = null;

  /* O glue sql.js (lib/sql-wasm.js) pode não estar incluído na página
     (a ordem de scripts do brief não o lista). Carrega-o
     dinamicamente — assim basta incluir js/mobile-db.js. */
  function loadSqlJsScript() {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = LIB_BASE + 'sql-wasm.js';
      el.onload = function () {
        if (typeof initSqlJs === 'function') resolve();
        else reject(new Error('lib/sql-wasm.js carregado sem initSqlJs'));
      };
      el.onerror = function () {
        reject(new Error('Não foi possível carregar lib/sql-wasm.js'));
      };
      document.head.appendChild(el);
    });
  }

  var initPromise = (async function () {
    if (typeof initSqlJs !== 'function') {
      if (typeof document !== 'undefined' && document.createElement) {
        await loadSqlJsScript();
      } else {
        throw new Error('sql.js (initSqlJs) não está carregado — falta lib/sql-wasm.js');
      }
    }
    var SQL = await initSqlJs({ locateFile: function (file) { return LIB_BASE + file; } });

    var fs = fsPlugin();
    var bytes = null;
    var fromPersistent = false;

    /* Escape hatch de teste: ?resetdb=1 limpa a BD persistida (browser) */
    if (idbAvailable() && typeof location !== 'undefined' && location.search) {
      if (location.search.indexOf('resetdb') >= 0) {
        try { await idbDelete(); } catch (eR) { /* irrelevante */ }
      }
    }

    if (fs) {
      try {
        await fsEnsureDir(fs);
        if (await fsExists(fs, FS_MAIN)) {
          bytes = await fsReadBytes(fs, FS_MAIN);
          fromPersistent = !!bytes;
        }
      } catch (e1) {
        console.warn('[mobile-db] Não foi possível ler a BD persistida, a usar a bundled:',
          e1 && e1.message || e1);
        bytes = null;
        fromPersistent = false;
      }
    } else if (idbAvailable()) {
      try {
        bytes = await idbLoad();
        fromPersistent = !!bytes;
      } catch (eIdb) {
        console.warn('[mobile-db] Não foi possível ler a BD do IndexedDB:',
          eIdb && eIdb.message || eIdb);
        bytes = null;
        fromPersistent = false;
      }
    } else {
      console.warn('[mobile-db] Capacitor Filesystem indisponível — base de dados SÓ EM MEMÓRIA (sem persistência).');
    }

    if (!bytes) {
      var res = await fetch(DB_URL);
      if (!res.ok) {
        throw new Error('Não foi possível carregar a base de dados (' + DB_URL + '): HTTP ' + res.status);
      }
      bytes = new Uint8Array(await res.arrayBuffer());
    }

    try {
      database = new SQL.Database(bytes);
    } catch (eOpen) {
      if (!fromPersistent) throw eOpen;
      /* BD persistida corrompida: auto-recuperação com a bundled */
      console.warn('[mobile-db] BD persistida corrompida, a recarregar a bundled:',
        eOpen && eOpen.message || eOpen);
      var res2 = await fetch(DB_URL);
      if (!res2.ok) {
        throw new Error('Não foi possível carregar a base de dados (' + DB_URL + '): HTTP ' + res2.status);
      }
      bytes = new Uint8Array(await res2.arrayBuffer());
      database = new SQL.Database(bytes);
      if (fs) {
        try { await fsWritePersistent(fs, bytes); } catch (eW) { /* fica em memória */ }
      } else if (idbAvailable()) {
        try { await idbSave(bytes); } catch (eW2) { /* fica em memória */ }
      }
    }

    if (fs && !fromPersistent) {
      /* 1.ª execução: copia a bundled para o diretório de dados */
      try {
        await fsWritePersistent(fs, bytes);
        console.log('[mobile-db] BD copiada para ' + FS_MAIN + ' (1.ª execução)');
      } catch (eCopy) {
        console.warn('[mobile-db] Não foi possível copiar a BD para disco:', eCopy && eCopy.message || eCopy);
      }
    } else if (!fs && !fromPersistent && idbAvailable()) {
      /* 1.ª execução em browser: guarda a bundled no IndexedDB */
      try {
        await idbSave(bytes);
        console.log('[mobile-db] BD copiada para IndexedDB (1.ª execução).');
      } catch (eCopy2) {
        console.warn('[mobile-db] Não foi possível copiar a BD para o IndexedDB:', eCopy2 && eCopy2.message || eCopy2);
      }
    }

    /* ------------------------------------------------------------
       Ponte pública — só definida depois de pronta
    ------------------------------------------------------------ */
    window.db = {
      exec: async function (sql, type) {
        await initPromise;
        if (!database) throw new Error('[mobile-db] Base de dados não inicializada');
        if (type === 'run') {
          var beforeDepth = txDepth;
          if (sql) txDepth = Math.max(0, txDepth + countTxStatements(sql));
          var txClosed = (beforeDepth > 0 && txDepth === 0);
          try {
            if (sql) database.exec(sql);
          } catch (eSql) {
            txDepth = beforeDepth; /* statement falhou: repor o estado da transação */
            throw eSql;
          }
          markDirty();
          /* browser plano: sem Filesystem a BD não sobrevive a uma navegação —
             persistir LOGO em IndexedDB (no device fica o debounce normal).
             Se uma transação acabou de fechar, persistir já (o utilizador
             pode navegar de imediato para a página seguinte). */
          if (!fsPlugin() && idbAvailable() && txDepth === 0) {
            try { await runPersist(); } catch (eF) { /* runPersist já avisa */ }
          }
          return undefined;
        }
        try {
          return queryRows(database, sql);
        } catch (eSql2) {
          throw eSql2;
        }
      },
      flush: flush
    };

    return database;
  })();

  /* Disponível imediatamente (as páginas podem aguardá-la antes de
     window.db existir). */
  window.dbReady = function () {
    return initPromise;
  };

  initPromise.catch(function (eInit) {
    console.error('[mobile-db] Inicialização falhou:', eInit && eInit.message || eInit);
  });
})();
