/* IMT_27_Codigo — local category access control.
   Category B/B1 (car) is always available for learning.  The master code
   unlocks the remaining categories on this device; no code is sent online. */
(function () {
  'use strict';
  var KEY = 'imt27_access_all';
  var MASTER = '5078';
  var DEFAULT_CATEGORY = 3;
  function allUnlocked() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function allowed(catId) { return allUnlocked() || Number(catId) === DEFAULT_CATEGORY; }
  async function syncDatabase(enabled) {
    if (!window.db || typeof window.db.exec !== 'function') return;
    try {
      /* Desktop-compatible permission state; harmless on older DB layouts. */
      await window.db.exec("update distribuicao set enabled = '" + (enabled ? '1' : '0') + "'", 'run');
      if (enabled) await window.db.exec("update distribuicao set enabled = '1' where code in ('3','B','B1')", 'run');
      if (window.db.flush) await window.db.flush();
    } catch (e) { console.warn('[access] permission sync skipped:', e && e.message || e); }
  }
  async function unlock(code) {
    if (String(code || '').trim() !== MASTER) return false;
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* session still continues */ }
    await syncDatabase(true);
    return true;
  }
  async function request(catId) {
    if (allowed(catId)) return true;
    var code = window.prompt('Introduza o código de acesso de 4 dígitos para desbloquear todos os testes.');
    if (code === null) return false;
    if (await unlock(code)) return true;
    window.alert('Código inválido. A categoria B/B1 mantém-se disponível para aprendizagem.');
    return false;
  }
  async function lockAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    await syncDatabase(false);
  }
  window.IMTAccess = { allowed: allowed, request: request, unlock: unlock, lockAll: lockAll, allUnlocked: allUnlocked };
})();
