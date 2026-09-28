/* =====================================================================
   mobile-main.js — arranque (splash) da versão móvel
   ---------------------------------------------------------------------
   Equivalente ao js/startup.js do Electron (que fica em www/js como
   referência): espera a base de dados (window.dbReady()), corre as
   verificações (SELECT 1, COUNT(*) perguntas) e abre o menu.
   Ecrã de destino: menu.html (página do agente MENU).
   ===================================================================== */
(async function () {
  'use strict';

  var statusEls = {
    db: document.getElementById('startup-db'),
    questions: document.getElementById('startup-questions'),
    access: document.getElementById('startup-access'),
    ready: document.getElementById('startup-ready')
  };
  var progress = document.getElementById('progress');
  var retry = document.getElementById('retry');
  var status = document.getElementById('startup-db');

  function done(id, value) {
    var el = statusEls[id];
    if (el) el.classList.add('done');
    if (progress) progress.value = value;
  }

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  retry.onclick = function () {
    location.reload();
  };

  /* As mesmas verificações do startup.js do Electron, com o mesmo
     prazo de 15 s por consulta. */
  function query(sql) {
    var timer;
    return Promise.race([
      window.db.exec(sql, 'get'),
      new Promise(function (_, reject) {
        timer = setTimeout(function () {
          reject(Error('A base de dados demorou demasiado a responder. Feche e volte a abrir a aplicação ou tente novamente.'));
        }, 15000);
      })
    ]).finally(function () { clearTimeout(timer); });
  }

  try {
    /* Keep the startup progress visible long enough to feel deliberate,
       while the database opens in the background. */
    await new Promise(function (r) { setTimeout(r, 220); });
    await window.dbReady();

    var rows = await query('SELECT 1 AS connected');
    done('db', 1);

    await new Promise(function (r) { setTimeout(r, 220); });

    setStatus(statusEls.questions.textContent);
    var countRows = await query('SELECT COUNT(*) AS total FROM perguntas');
    if (!countRows.length || Number(countRows[0].total) === 0) {
      throw Error('A base de dados não contém perguntas.');
    }
    done('questions', 2);

    await new Promise(function (r) { setTimeout(r, 220); });

    setStatus(statusEls.access.textContent);
    done('access', 3);

    await new Promise(function (r) { setTimeout(r, 220); });

    setStatus(statusEls.ready.textContent);
    done('ready', 4);

    await new Promise(function (r) {
      requestAnimationFrame(function () { requestAnimationFrame(r); });
    });
    location.replace('menu.html');
  } catch (e) {
    setStatus(e.message || 'Não foi possível iniciar a aplicação.');
    retry.hidden = false;
  }
})();
