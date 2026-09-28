/* =====================================================================
   tts.js - Leitura em voz alta (PT/EN/PA)
   ---------------------------------------------------------------------
   - speakTTSText(texto, lang): usa a voz do sistema quando existe para o
     idioma; senão usa o serviço TTS (window.TTS, rede) — Google TTS.
   - Botões 🔊: ttsDecorate() acrescenta botões às perguntas/respostas;
     ttsDecorateSlide(l) volta a acrescentar depois de re-renderizar.
   - A página define: ttsOrderFn(l, i) -> letra original da resposta i.
   ===================================================================== */

var ttsAudio = null;

function ttsBtnQ(n) {
	return '<span class="tts-btn" onclick="ttsSayQ(' + n + ')">&#128266;</span>';
}
function ttsBtnA(n, letter) {
	return '<span class="tts-btn" onclick="ttsSayA(' + n + ',\'' + letter + '\')">&#128266;</span>';
}

function ttsDecorate() {
	var slides = document.querySelectorAll('#showcase .showcase-slide');
	for (var l = 0; l < slides.length; l++) {
		ttsDecorateSlide(l);
	}
}

function ttsDecorateSlide(l) {
	var slides = document.querySelectorAll('#showcase .showcase-slide');
	if (!slides[l]) return;
	var qa = slides[l].querySelector('.t-box-info-question-area');
	if (qa && !qa.querySelector('.tts-btn')) {
		var btn = document.createElement('span');
		btn.className = 'tts-btn';
		btn.innerHTML = '&#128266;';
		btn.onclick = (function (n) { return function () { ttsSayQ(n); }; })(l + 1);
		qa.insertBefore(btn, qa.firstChild);
	}
	var tvs = slides[l].querySelectorAll('.t-question-area-text-v');
	for (var i = 0; i < tvs.length; i++) {
		if (tvs[i].querySelector('.tts-btn')) continue;
		var letter = null;
		if (typeof ttsOrderFn == 'function') letter = ttsOrderFn(l, i);
		if (!letter) continue;
		var b = document.createElement('span');
		b.className = 'tts-btn';
		b.innerHTML = '&#128266;';
		b.onclick = (function (n, letr) { return function () { ttsSayA(n, letr); }; })(l + 1, letter);
		tvs[i].insertBefore(b, tvs[i].firstChild);
	}
}

function ttsGetQuestion(n) {
	if (typeof masterQArray != 'undefined' && masterQArray[n - 1]) return masterQArray[n - 1];
	if (typeof reviewMaster != 'undefined' && reviewMaster[n - 1]) return reviewMaster[n - 1];
	return null;
}

function ttsSayQ(n) {
	var q = ttsGetQuestion(n);
	if (!q) return;
	speakTTSText(textFor(q, 'pergunta'), currentLang);
}

function ttsSayA(n, letter) {
	var q = ttsGetQuestion(n);
	if (!q) return;
	speakTTSText(textFor(q, 'resposta_' + letter), currentLang);
}

function speakTTSText(text, lang) {
	if (!text) return;
	stopTTS();
	var l = lang == 'pt' ? 'pt' : (lang == 'en' ? 'en' : 'pa');
	/* 1. voz do sistema (offline) se existir para o idioma */
	if (window.speechSynthesis) {
		var voices = window.speechSynthesis.getVoices();
		var v = null;
		for (var i = 0; i < voices.length; i++) {
			if (voices[i].lang && voices[i].lang.toLowerCase().indexOf(l) === 0) { v = voices[i]; break; }
		}
		if (v) {
			var u = new SpeechSynthesisUtterance(text);
			u.voice = v;
			u.lang = v.lang;
			window.speechSynthesis.speak(u);
			return;
		}
	}
	/* 2. serviço TTS (rede) para os idiomas sem voz instalada */
	if (window.TTS && window.TTS.say) {
		window.TTS.say(text, l).then(function (res) {
			playTTSChunks(res && res.chunks ? res.chunks : []);
		}).catch(function () {
			alert('Voz indisponível para este idioma (sem voz instalada e sem ligação à internet).');
		});
	} else {
		alert('Voz indisponível para este idioma.');
	}
}

function playTTSChunks(chunks) {
	if (!chunks || !chunks.length) return;
	var i = 0;
	function next() {
		if (i >= chunks.length) { ttsAudio = null; return; }
		var a = new Audio('data:audio/mpeg;base64,' + chunks[i]);
		ttsAudio = a;
		a.onended = function () { i++; next(); };
		a.play();
	}
	next();
}

function stopTTS() {
	if (ttsAudio) { try { ttsAudio.pause(); } catch (e) {} ttsAudio = null; }
	if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) {} }
}
