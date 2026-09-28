/* =====================================================================
   mobile-apputil.js — stub AppUtil para a versão móvel (Capacitor)
   ---------------------------------------------------------------------
   Espelha o AppUtil do preload.js do Electron, mas degrada com
   elegância quando o Capacitor não existe (browser plano / testes):
     info.Appdirectory      -> '/'
     getFile(f,type)        -> Capacitor Filesystem (utf8) | false
     checkFile(f)           -> boolean | false
     DeleteFile(f)          -> Capacitor Filesystem | false
     Process.createProcess  -> false (não há processos no móvel)
     Pathjoin(a,b)          -> concatenação simples
     App.Exit()             -> Capacitor App.exitApp() | no-op
   ===================================================================== */
(function () {
  'use strict';

  function plugin(name) {
    try {
      if (typeof window === 'undefined' || !window.Capacitor) return null;
      var p = window.Capacitor.Plugins;
      if (!p || !p[name]) return null;
      return p[name];
    } catch (e) {
      return null;
    }
  }

  window.AppUtil = {
    getFile: async function (filename, type) {
      var fs = plugin('Filesystem');
      if (!fs || typeof fs.readFile !== 'function') return false;
      try {
        var res = await fs.readFile({
          path: String(filename),
          encoding: (type === 'base64' || type === 'binary') ? undefined : 'utf8'
        });
        return (res && res.data != null) ? res.data : false;
      } catch (e) {
        return false;
      }
    },

    checkFile: async function (filename) {
      var fs = plugin('Filesystem');
      if (!fs) return false;
      try {
        if (typeof fs.stat === 'function') {
          await fs.stat({ path: String(filename) });
          return true;
        }
        if (typeof fs.readFile === 'function') {
          await fs.readFile({ path: String(filename) });
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    },

    DeleteFile: async function (filename) {
      var fs = plugin('Filesystem');
      if (!fs || typeof fs.deleteFile !== 'function') return false;
      try {
        await fs.deleteFile({ path: String(filename) });
        return true;
      } catch (e) {
        return false;
      }
    },

    info: {
      plataform: (function () {
        try {
          if (typeof window !== 'undefined' && window.Capacitor) return 'android';
        } catch (e) { /* ignorar */ }
        return 'web';
      })(),
      Appdirectory: '/'
    },

    Process: {
      createProcess: function () {
        return false;
      }
    },

    Pathjoin: function (directory, file) {
      try {
        var a = String(directory == null ? '' : directory);
        var b = String(file == null ? '' : file);
        if (!a) return b;
        if (!b) return a;
        if (a.charAt(a.length - 1) === '/' || b.charAt(0) === '/') return a + b;
        return a + '/' + b;
      } catch (e) {
        return false;
      }
    },

    App: {
      Exit: function () {
        var app = plugin('App');
        if (app && typeof app.exitApp === 'function') {
          try { app.exitApp(); return true; } catch (e) { return false; }
        }
        return false; /* no-op fora do Capacitor */
      }
    }
  };
})();
