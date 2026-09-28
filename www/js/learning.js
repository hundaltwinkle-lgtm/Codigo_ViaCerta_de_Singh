/* IMT_27 Learning Profile — local, private and offline-first. */
(function () {
  'use strict';
  var KEY = 'imt27_learning_profile_v2';
  var MAX_HISTORY = 80;

  function empty() {
    return {
      version: 2,
      tests: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
      lastCategory: 3,
      lastTestType: 1,
      lastActivity: null,
      activityDays: {},
      categories: {},
      themes: {},
      mistakes: {},
      history: []
    };
  }
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return empty();
      var base = empty();
      Object.keys(base).forEach(function (k) { if (p[k] === undefined) p[k] = base[k]; });
      return p;
    } catch (e) { return empty(); }
  }
  function write(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); return true; }
    catch (e) { return false; }
  }
  function int(v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.round(v)) : 0; }
  function dayKey(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function categoryKey(catId, testType) { return String(catId) + ':' + String(testType || 1); }
  function themeKey(catId, testType, themeId) { return categoryKey(catId, testType) + ':' + String(themeId); }

  function recordResult(data) {
    data = data || {};
    var p = read();
    var ts = data.timestamp || new Date().toISOString();
    var c = int(data.correct), w = int(data.wrong), b = int(data.blank), total = int(data.total || (c + w + b));
    var catId = Number(data.catId || 0), testType = Number(data.testType || 1);
    p.tests += 1;
    p.correct += c; p.wrong += w; p.blank += b;
    if (catId) p.lastCategory = catId;
    p.lastTestType = testType || 1;
    p.lastActivity = ts;
    p.activityDays[dayKey(ts)] = 1;

    var ck = categoryKey(catId, testType);
    var cs = p.categories[ck] || { catId: catId, testType: testType, tests: 0, correct: 0, wrong: 0, blank: 0 };
    cs.tests += 1; cs.correct += c; cs.wrong += w; cs.blank += b;
    p.categories[ck] = cs;

    (data.themes || []).forEach(function (t) {
      var tk = themeKey(t.catId || catId, testType, t.themeId);
      var s = p.themes[tk] || {
        catId: Number(t.catId || catId), testType: testType, themeId: Number(t.themeId || 0),
        name: t.name || '', nameEn: t.nameEn || '', correct: 0, wrong: 0
      };
      if (t.name) s.name = t.name;
      if (t.nameEn) s.nameEn = t.nameEn;
      s.correct += int(t.correct); s.wrong += int(t.wrong);
      p.themes[tk] = s;
    });

    (data.wrongIds || []).forEach(function (id) {
      id = String(id);
      var m = p.mistakes[id] || { id: Number(id), catId: catId, testType: testType, score: 0, wrong: 0, correctAfter: 0 };
      m.catId = catId; m.testType = testType; m.score = Math.min(12, int(m.score) + 2); m.wrong = int(m.wrong) + 1; m.lastWrong = ts;
      p.mistakes[id] = m;
    });
    (data.correctIds || []).forEach(function (id) {
      id = String(id);
      var m = p.mistakes[id];
      if (!m) return;
      m.score = Math.max(0, int(m.score) - 1); m.correctAfter = int(m.correctAfter) + 1; m.lastCorrect = ts;
      if (m.score <= 0) delete p.mistakes[id]; else p.mistakes[id] = m;
    });

    p.history.unshift({
      id: String(data.answersId || ts), timestamp: ts, catId: catId, testType: testType,
      correct: c, wrong: w, blank: b, total: total,
      pct: total ? Math.round((c * 100) / total) : 0,
      approved: !!data.approved, practice: !!data.practice
    });
    p.history = p.history.slice(0, MAX_HISTORY);
    write(p);
    return p;
  }

  function summary() {
    var p = read();
    var attempts = p.correct + p.wrong + p.blank;
    var accuracy = attempts ? Math.round((p.correct * 100) / attempts) : 0;
    var weak = Object.keys(p.mistakes).filter(function (id) { return int(p.mistakes[id].score) > 0; }).length;
    var streak = 0, d = new Date();
    for (var i = 0; i < 365; i++) {
      var k = dayKey(d);
      if (p.activityDays[k]) streak++; else if (i > 0 || p.lastActivity) break;
      d.setDate(d.getDate() - 1);
    }
    return { tests: p.tests, correct: p.correct, wrong: p.wrong, blank: p.blank, attempts: attempts, accuracy: accuracy,
      weak: weak, streak: streak, lastCategory: p.lastCategory || 3, lastTestType: p.lastTestType || 1, lastActivity: p.lastActivity };
  }

  function weakGroups() {
    var p = read(), map = {};
    Object.keys(p.mistakes).forEach(function (id) {
      var m = p.mistakes[id]; if (!m || int(m.score) <= 0) return;
      var k = categoryKey(m.catId, m.testType);
      if (!map[k]) map[k] = { catId: Number(m.catId), testType: Number(m.testType || 1), count: 0, weight: 0 };
      map[k].count += 1; map[k].weight += int(m.score);
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.weight - a.weight || b.count - a.count; });
  }
  function mistakeIds(catId, testType) {
    var p = read(), arr = [];
    Object.keys(p.mistakes).forEach(function (id) {
      var m = p.mistakes[id];
      if (m && Number(m.catId) === Number(catId) && Number(m.testType || 1) === Number(testType || 1) && int(m.score) > 0) {
        arr.push({ id: Number(id), score: int(m.score), lastWrong: m.lastWrong || '' });
      }
    });
    arr.sort(function (a, b) { return b.score - a.score || String(a.lastWrong).localeCompare(String(b.lastWrong)); });
    return arr.map(function (x) { return x.id; });
  }
  function topWeakThemes(limit) {
    var p = read(), arr = [];
    Object.keys(p.themes).forEach(function (k) {
      var t = p.themes[k], n = int(t.correct) + int(t.wrong);
      if (!n) return;
      arr.push(Object.assign({}, t, { total: n, accuracy: Math.round(int(t.correct) * 100 / n) }));
    });
    arr.sort(function (a, b) { return a.accuracy - b.accuracy || b.total - a.total; });
    return arr.slice(0, limit || 8);
  }
  function categoryStats() {
    var p = read();
    return Object.keys(p.categories).map(function (k) {
      var s = p.categories[k], n = int(s.correct) + int(s.wrong) + int(s.blank);
      return Object.assign({}, s, { total: n, accuracy: n ? Math.round(int(s.correct) * 100 / n) : 0 });
    }).sort(function (a, b) { return b.tests - a.tests || b.total - a.total; });
  }
  function history() { return read().history || []; }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} }

  window.IMTLearning = {
    read: read, summary: summary, recordResult: recordResult, weakGroups: weakGroups,
    mistakeIds: mistakeIds, topWeakThemes: topWeakThemes, categoryStats: categoryStats, history: history, reset: reset
  };
})();
