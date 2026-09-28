/* =====================================================================
   mobile-tts.js — ponte TTS para a versão móvel
   ---------------------------------------------------------------------
   window.TTS.say(text, lang) -> Promise que resolve (com {chunks: []},
   o mesmo shape que o ttsService.js do Electron) quando a fala termina
   ou é cancelada; se não houver voz para o idioma, resolve silenciosa-
   mente (o js/tts.js legado faz playTTSChunks([]) = no-op, sem alerta).
   window.TTS.stop()           -> cancela qualquer fala em curso.
   Vozes: speechSynthesis (Web Speech API) com preferência por
     pt-PT, depois pt-BR, depois qualquer pt;
     pa-IN (Gurmukhi), depois pa / pa-Guru;
     en-GB, depois qualquer en.
   Se a lista de vozes ainda não estiver carregada, espera o evento
   'voiceschanged' (requeue) com um prazo de segurança.
   ===================================================================== */
(function () {
  'use strict';

  var VOICE_CANDIDATES = {
    pt: ['pt-PT', 'pt-BR', 'pt'],
    pa: ['pa-IN', 'pa-Guru', 'pa'],
    en: ['en-GB', 'en-US', 'en']
  };

  function synthGlobal() {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) return window.speechSynthesis;
    } catch (e) { /* ignorar */ }
    try {
      if (typeof globalThis !== 'undefined' && globalThis.speechSynthesis) return globalThis.speechSynthesis;
    } catch (e) { /* ignorar */ }
    return null;
  }

  function utteranceClass() {
    try {
      if (typeof window !== 'undefined' && window.SpeechSynthesisUtterance) return window.SpeechSynthesisUtterance;
    } catch (e) { /* ignorar */ }
    try {
      if (typeof globalThis !== 'undefined' && globalThis.SpeechSynthesisUtterance) return globalThis.SpeechSynthesisUtterance;
    } catch (e) { /* ignorar */ }
    return null;
  }

  function langBase(lang) {
    var l = String(lang || 'pt').toLowerCase();
    if (l === 'pt' || l === 'pt-pt' || l === 'pt-br') return 'pt';
    if (l === 'pa' || l === 'pa-in' || l === 'pa-pk' || l.indexOf('pa-guru') === 0) return 'pa';
    if (l === 'en' || l === 'en-gb' || l === 'en-us' || l === 'en-au') return 'en';
    return l;
  }

  function voiceLang(voice) {
    return String((voice && voice.lang) || '').toLowerCase();
  }

  /* 1.ª passada: igualdade exata na ordem dos candidatos
     (ex.: pt-PT antes de pt-BR; en-GB antes de en-US).
     2.ª passada: prefixo (ex.: 'pt' casa com pt-PT/pt-BR/...). */
  function pickVoice(lang) {
    var synth = synthGlobal();
    if (!synth || typeof synth.getVoices !== 'function') return null;
    var voices = synth.getVoices();
    if (!voices || !voices.length) return null;
    var candidates = VOICE_CANDIDATES[langBase(lang)] || [langBase(lang)];
    var i, j, v;
    for (j = 0; j < candidates.length; j++) {
      for (i = 0; i < voices.length; i++) {
        v = voiceLang(voices[i]);
        if (v === candidates[j]) return voices[i];
      }
    }
    for (j = 0; j < candidates.length; j++) {
      for (i = 0; i < voices.length; i++) {
        v = voiceLang(voices[i]);
        if (v.indexOf(candidates[j]) === 0) return voices[i];
      }
    }
    return null;
  }

  /* Espera as vozes carregarem (voiceschanged) e tenta de novo; se
     mesmo assim não houver voz, resolve silenciosamente. */
  function say(text, lang) {
    return new Promise(function (resolve) {
      var nativeTts = null;
      try {
        nativeTts = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeTts;
      } catch (e) { /* use Web Speech fallback */ }

      if (nativeTts && typeof nativeTts.speak === 'function') {
        nativeTts.speak({
          text: String(text == null ? '' : text),
          lang: String(lang || 'pt-PT')
        }).then(function () {
          resolve({ chunks: [] });
        }).catch(function () {
          sayWithWebSpeech(text, lang, resolve);
        });
        return;
      }

      sayWithWebSpeech(text, lang, resolve);
    });
  }

  function sayWithWebSpeech(text, lang, resolve) {
      var done = false;
      var synth = synthGlobal();
      var Utterance = utteranceClass();

      if (!synth || typeof synth.speak !== 'function' || !Utterance) {
        resolve({ chunks: [] });
        return;
      }

      function finish() {
        if (done) return;
        done = true;
        cleanup();
        resolve({ chunks: [] });
      }

      function speakWith(voice) {
        var u = new Utterance(String(text == null ? '' : text));
        u.voice = voice;
        u.lang = voice.lang;
        u.onend = finish;
        u.onerror = finish;
        u.oncancel = finish;
        if (typeof synth.speak === 'function') synth.speak(u);
        else finish();
      }

      var attempts = 0;
      var wakeTimers = [];

      function cleanup() {
        for (var t = 0; t < wakeTimers.length; t++) clearTimeout(wakeTimers[t]);
        wakeTimers = [];
        if (synth && typeof synth.removeEventListener === 'function') {
          try { synth.removeEventListener('voiceschanged', onVoicesChanged); } catch (e) { /* ignorar */ }
        }
      }

      function onVoicesChanged() {
        if (done) return;
        var v = pickVoice(lang);
        if (v) { cleanup(); speakWith(v); return; }
        attempts++;
        if (attempts >= 4) { cleanup(); resolve({ chunks: [] }); }
      }

      function wake() {
        if (done) return;
        var v = pickVoice(lang);
        if (v) { cleanup(); speakWith(v); return; }
        attempts++;
        if (attempts >= 4) { cleanup(); resolve({ chunks: [] }); }
      }

      var v = pickVoice(lang);
      if (v) { speakWith(v); return; }

      if (synth && typeof synth.addEventListener === 'function') {
        try { synth.addEventListener('voiceschanged', onVoicesChanged); } catch (e) { /* ignorar */ }
      }
      wakeTimers.push(setTimeout(wake, 400));   /* 1.ª verificação curta */
      wakeTimers.push(setTimeout(wake, 2500));  /* 2.ª verificação */
      wakeTimers.push(setTimeout(function () { cleanup(); resolve({ chunks: [] }); }, 6000));
  }

  function stop() {
    try {
      var nativeTts = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeTts;
      if (nativeTts && typeof nativeTts.stop === 'function') nativeTts.stop();
    } catch (e) { /* continue and stop Web Speech too */ }
    try {
      var synth = synthGlobal();
      if (synth && typeof synth.cancel === 'function') synth.cancel();
    } catch (e) { /* ignorar */ }
  }

  window.TTS = {
    say: say,
    stop: stop
  };
})();
