/* IMT_27 learning, sessions and diagnostics.  All tables are additive: old
 * exam/result data remains the source of truth and is never rewritten. */
(function () {
  'use strict';
  var schema = [
    'CREATE TABLE IF NOT EXISTS imt_learning_question (question_id INTEGER PRIMARY KEY, category_id INTEGER, theme_id INTEGER, state TEXT NOT NULL DEFAULT \'new\', ease REAL NOT NULL DEFAULT 2.3, interval_days INTEGER NOT NULL DEFAULT 0, due_at INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, last_answered_at INTEGER, last_correct INTEGER)',
    'CREATE TABLE IF NOT EXISTS imt_learning_session (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, finished_at INTEGER, mode TEXT NOT NULL, category_id INTEGER, planned_count INTEGER, answered_count INTEGER DEFAULT 0, correct_count INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS imt_learning_event (id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at INTEGER NOT NULL, session_id TEXT, question_id INTEGER, category_id INTEGER, theme_id INTEGER, mode TEXT, correct INTEGER, answer TEXT)',
    'CREATE TABLE IF NOT EXISTS imt_app_log (id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at INTEGER NOT NULL, level TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, detail TEXT)'
  ];
  function sql(v) { return String(v == null ? '' : v).replace(/'/g, "''"); }
  function uid() { return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  async function run(q) { await window.dbReady(); return window.db.exec(q, 'run'); }
  async function get(q) { await window.dbReady(); return window.db.exec(q, 'get'); }
  async function init() { for (var i = 0; i < schema.length; i++) await run(schema[i]); }
  async function log(level, source, message, detail) {
    try { await init(); await run("INSERT INTO imt_app_log(occurred_at,level,source,message,detail) VALUES(" + Date.now() + ",'" + sql(level) + "','" + sql(source) + "','" + sql(message).slice(0, 800) + "','" + sql(detail).slice(0, 4000) + "')"); } catch (_) { }
  }
  async function recordAttempt(a) {
    await init();
    var now = Date.now(), id = Number(a.questionId), correct = a.correct ? 1 : 0;
    if (!isFinite(id)) return;
    var old = (await get('SELECT * FROM imt_learning_question WHERE question_id=' + id))[0] || {};
    var attempts = Number(old.attempts || 0) + 1, successes = Number(old.correct || 0) + correct;
    var ease = Math.max(1.3, Math.min(3.0, Number(old.ease || 2.3) + (correct ? 0.12 : -0.28)));
    var interval = correct ? Math.max(1, Math.round((Number(old.interval_days || 0) || 1) * ease)) : 1;
    var state = !correct ? 'learning' : (successes >= 3 ? 'mastered' : 'review');
    await run("INSERT INTO imt_learning_question(question_id,category_id,theme_id,state,ease,interval_days,due_at,attempts,correct,last_answered_at,last_correct) VALUES(" + id + ',' + Number(a.categoryId || 0) + ',' + Number(a.themeId || 0) + ",'" + state + "'," + ease + ',' + interval + ',' + (now + interval * 86400000) + ',' + attempts + ',' + successes + ',' + now + ',' + correct + ") ON CONFLICT(question_id) DO UPDATE SET category_id=excluded.category_id,theme_id=excluded.theme_id,state=excluded.state,ease=excluded.ease,interval_days=excluded.interval_days,due_at=excluded.due_at,attempts=excluded.attempts,correct=excluded.correct,last_answered_at=excluded.last_answered_at,last_correct=excluded.last_correct");
    await run("INSERT INTO imt_learning_event(occurred_at,session_id,question_id,category_id,theme_id,mode,correct,answer) VALUES(" + now + ",'" + sql(a.sessionId) + "'," + id + ',' + Number(a.categoryId || 0) + ',' + Number(a.themeId || 0) + ",'" + sql(a.mode || 'exam') + "'," + correct + ",'" + sql(a.answer) + "')");
  }
  async function recordResult(payload) {
    var entries = String(payload.answers || '').split(';');
    for (var i = 0; i < entries.length; i++) {
      var p = entries[i].split(','), id = Number(p[2]); if (!isFinite(id)) continue;
      var q = (await get('SELECT categoria,tema,correcta FROM perguntas WHERE id=' + id + ' LIMIT 1'))[0]; if (!q) continue;
      await recordAttempt({ questionId:id, categoryId:q.categoria, themeId:q.tema, correct:String(q.correcta) === String(p[1]), answer:p[1], mode:payload.mode || 'exam', sessionId:payload.sessionId });
    }
    if (window.db && window.db.flush) await window.db.flush();
  }
  async function dashboard() {
    await init(); var now=Date.now();
    var summary=(await get('SELECT COUNT(*) total, SUM(CASE WHEN state=\'mastered\' THEN 1 ELSE 0 END) mastered, SUM(CASE WHEN due_at<= ' + now + ' THEN 1 ELSE 0 END) due, SUM(attempts) attempts, SUM(correct) correct FROM imt_learning_question'))[0] || {};
    summary.total=Number(summary.total||0); summary.mastered=Number(summary.mastered||0); summary.due=Number(summary.due||0); summary.attempts=Number(summary.attempts||0); summary.correct=Number(summary.correct||0);
    summary.accuracy=summary.attempts ? Math.round(summary.correct*100/summary.attempts) : 0;
    return summary;
  }
  async function topics() { await init(); return get("SELECT l.category_id,l.theme_id,COUNT(*) total,ROUND(100.0*SUM(l.correct)/NULLIF(SUM(l.attempts),0)) accuracy, SUM(CASE WHEN l.due_at<=" + Date.now() + " THEN 1 ELSE 0 END) due, COALESCE(t.nome,'Tema ' || l.theme_id) name FROM imt_learning_question l LEFT JOIN tema t ON t.tema=l.theme_id AND t.cat_id=l.category_id GROUP BY l.category_id,l.theme_id ORDER BY due DESC,accuracy ASC"); }
  async function diagnostics() { await init(); return { version:'2.0', time:new Date().toISOString(), dashboard:await dashboard(), logs:await get('SELECT occurred_at,level,source,message,detail FROM imt_app_log ORDER BY id DESC LIMIT 100') }; }
  async function exportDiagnostics() { return JSON.stringify(await diagnostics(), null, 2); }
  window.IMTLearning = { init:init, log:log, recordAttempt:recordAttempt, recordResult:recordResult, dashboard:dashboard, topics:topics, diagnostics:diagnostics, exportDiagnostics:exportDiagnostics, startSession:async function(mode,cat,count){await init();var id=uid();await run("INSERT INTO imt_learning_session(id,started_at,mode,category_id,planned_count) VALUES('"+id+"',"+Date.now()+",'"+sql(mode)+"',"+Number(cat||0)+","+Number(count||0)+")");return id;} };
  window.addEventListener('error', function(e){ log('error','window',e.message,(e.filename||'')+':'+(e.lineno||'')); });
  window.addEventListener('unhandledrejection', function(e){ log('error','promise',String(e.reason && e.reason.message || e.reason),''); });
}());
