/* =====================================================================
   ai.js - Integração IA + conjunto mestre de perguntas (PT/EN)
   ---------------------------------------------------------------------
   - textFor(q, campo): devolve o texto no idioma atual. Se for EN e não
     existir tradução, faz fallback para o PT (mesma pergunta mestre).
   - getQuestionAI(q): devolve tradução EN + explicações PT/EN/PA de uma
     pergunta. Guarda o resultado na BD (cache permanente) para nunca
     repetir chamadas de IA à mesma pergunta.
   - Painel de explicação por slide: buildExplanationPanelHTML(n),
     loadAI(n), setAILang(l,n), renderAIPanel(n). A página define:
       getQuestionForAI(n)      -> objeto da pergunta (q_id, pergunta,
                                    resposta_a..d, correcta, imagePath, imagem)
       onQuestionTranslated(n)  -> atualizar o texto do slide (opcional)
   ===================================================================== */

function textFor(q, field) {
	if (typeof currentLang != 'undefined' && (currentLang == 'en' || currentLang == 'pa')) {
		var v = q[field + '_' + currentLang];
		if (v != null && v != undefined && v != '' && v != 'ignorar' && v != 'null') return v;
	}
	var w = q[field];
	if (w == null || w == undefined) return '';
	return w;
}

function validText(v) {
	return v != null && v != '' && v != 'ignorar' && v != 'null';
}

/* Aplica as traduções devolvidas pela IA ao objeto da pergunta */
function applyAIToQuestion(q, d) {
	if (!q || !d) return;
	if (d.question_en) {
		q.pergunta_en = d.question_en;
		q.resposta_a_en = d.answer_a_en;
		q.resposta_b_en = d.answer_b_en;
		q.resposta_c_en = d.answer_c_en;
		q.resposta_d_en = d.answer_d_en;
	}
	if (d.question_pa) {
		q.pergunta_pa = d.question_pa;
		q.resposta_a_pa = d.answer_a_pa;
		q.resposta_b_pa = d.answer_b_pa;
		q.resposta_c_pa = d.answer_c_pa;
		q.resposta_d_pa = d.answer_d_pa;
	}
}

var aiPromises = {};

/* getAIState() devolve as colunas da BD (explicacao_pt, pergunta_en, ...);
   o modal e a aplicacao das traducoes usam explanation_* / question_en.
   Normaliza os dois formatos para o mesmo objeto. */
function normalizeAICacheRow(row) {
	if (!row) return row;
	if (row.explanation_pt === undefined) row.explanation_pt = row.explicacao_pt;
	if (row.explanation_en === undefined) row.explanation_en = row.explicacao_en;
	if (row.explanation_pa === undefined) row.explanation_pa = row.explicacao_pa;
	if (row.question_en === undefined) row.question_en = row.pergunta_en;
	if (row.question_pa === undefined) row.question_pa = row.pergunta_pa;
	if (row.answer_a_en === undefined) row.answer_a_en = row.resposta_a_en;
	if (row.answer_b_en === undefined) row.answer_b_en = row.resposta_b_en;
	if (row.answer_c_en === undefined) row.answer_c_en = row.resposta_c_en;
	if (row.answer_d_en === undefined) row.answer_d_en = row.resposta_d_en;
	if (row.answer_a_pa === undefined) row.answer_a_pa = row.resposta_a_pa;
	if (row.answer_b_pa === undefined) row.answer_b_pa = row.resposta_b_pa;
	if (row.answer_c_pa === undefined) row.answer_c_pa = row.resposta_c_pa;
	if (row.answer_d_pa === undefined) row.answer_d_pa = row.resposta_d_pa;
	return row;
}

async function getQuestionAI(q) {
	var id = q.q_id || q.id;
	if (!id) throw new Error('AI: pergunta sem id');
	if (aiPromises[id]) return aiPromises[id];

	aiPromises[id] = (async function () {
		// Always reload this exact database record: q can be a shuffled display object.
		var sourceRows = await getAIQuestionSource(id);
		var source = (sourceRows && sourceRows.length) ? sourceRows[0] : q;
		var answers = [source.resposta_a || '', source.resposta_b || '', source.resposta_c || '', source.resposta_d || ''];
		var letters = ['A','B','C','D'];
		var correctIndex = letters.indexOf(String(source.correcta || '').toUpperCase());
		var correctText = correctIndex >= 0 ? answers[correctIndex] : '';

		var cached = await getAIState(id);
		var row = normalizeAICacheRow((cached && cached.length) ? cached[0] : null);
		var hasExpl = row && (validText(row.explanation_pt) || validText(row.explanation_en) || validText(row.explanation_pa));
		var expectedHeader = '✅ Resposta correta: ' + correctText;
		var cacheMatchesDatabaseAnswer = row && String(row.explanation_pt || '').trim().indexOf(expectedHeader) === 0;
		if (row && row.explicacao_ok == 1 && hasExpl && cacheMatchesDatabaseAnswer) {
			await saveEquivalentAIExplanation(source.pergunta || '', correctText, row);
			return row; // exact DB answer cache; no AI request
		}
		if (typeof window.AI == 'undefined' || typeof window.AI.explain != 'function') {
			throw new Error('AI bridge unavailable');
		}
		var equivalent = await getEquivalentAIExplanation(source.pergunta || '', correctText);
		if (equivalent && equivalent.length) {
			var reused = normalizeAICacheRow(equivalent[0]);
			await saveEquivalentAIExplanation(source.pergunta || '', correctText, reused);
			return reused;
		}
		var res = await window.AI.explain({
			question: source.pergunta || '',
			answers: answers,
			correct: String(source.correcta || '').toUpperCase(),
			imagePath: (q.imagePath || '') + (source.imagem || q.imagem || '')
		});
		var data = (typeof res === 'string') ? JSON.parse(res) : res;
		await saveAIResult(id, data); // translations remain mapped to this exact row
		await saveEquivalentAIExplanation(source.pergunta || '', correctText, data);
		data.explicacao_ok = 1;
		return data;
	})();

	try {
		return await aiPromises[id];
	} catch (e) {
		aiPromises[id] = null;
		throw e;
	}
}

/* ===== Explicação por pergunta: 1 chip discreto + 1 modal único =====
   Nada carrega antecipadamente: só clicando. Resultado fica em cache na BD.
   A página define: getQuestionForAI(n) e onQuestionTranslated(n). */

var aiLang = 'pt';
var aiDataStore = {};
var aiCurrent = 0;
var aiReadyMap = {};   /* qid -> true quando a explicacion ja esta na BD */

/* When the batch prefill is active, its result is the shared source for the
   modal.  Polling SQLite avoids a duplicate API request and a modal that keeps
   waiting after the batch has already saved this question. */
async function waitForBatchExplanation(qid, timeoutMs) {
	if (!aiExplFillRunning || typeof getAIState != 'function') return null;
	var deadline = Date.now() + (timeoutMs || 125000);
	while (aiExplFillRunning && Date.now() < deadline) {
		var rows = await getAIState(qid);
		var row = normalizeAICacheRow((rows && rows.length) ? rows[0] : null);
		var hasExpl = row && (validText(row.explanation_pt) || validText(row.explanation_en) || validText(row.explanation_pa));
		if (row && row.explicacao_ok == 1 && hasExpl) return row;
		await new Promise(function (resolve) { setTimeout(resolve, 500); });
	}
	return null;
}
function aiChipHTML(n) {
	/* Chip sempre renderizado DISABLED; refreshAllAIChips() activa/desactiva
	   visor e clic segundo explicacao_ok na BD (ver #selectability) */
	return '<div class="ai-chip-row"><span class="ai-chip ai-chip-disabled" id="aiChip_' + n + '" onclick="openAIChip(' + n + ')">&#9432; Explicação IA</span></div>';
}

/* Requisito: explicacion IN-SELECTABLE ate existir na BD */
function openAIChip(n) {
	/* Test pages can render an explanation in the question's free space. */
	if (typeof showInlineAIExplanation == 'function') {
		showInlineAIExplanation(n);
		return;
	}
	var el = $('#aiChip_' + n);
	if (el.length && el.hasClass('ai-chip-disabled')) return;
	openAIModal(n);
}

function toggleAIChip(n, ready) {
	var el = $('#aiChip_' + n);
	if (!el.length) return;
	if (ready) el.removeClass('ai-chip-disabled');
	else el.addClass('ai-chip-disabled');
}

/* Le o estado explicacao_ok de TODAS as perguntas cargadas e pinta os chips.
   Necessario tambem depois de cada rewiew/render do showcase (o plugin
   reconstrue o slide e repoe o markup PT original, chips incluidos). */
function refreshAllAIChips() {
	if (typeof getQuestionForAI != 'function') return;
	var qids = [], byN = {};
	for (var n = 1; ; n++) {
		var q = getQuestionForAI(n);
		if (!q) break;
		var qid = q.q_id || q.id;
		if (!qid) continue;
		qids.push(qid);
		byN[n] = qid;
	}
	if (!qids.length) return;
	if (typeof getQuestionAIStates != 'function') return;
	getQuestionAIStates(qids.join(',')).then(function (rows) {
		var ok = {};
		rows.forEach(function (r) {
			ok[r.id] = (r.explicacao_ok == 1 && (validText(r.explicacao_pt) || validText(r.explicacao_en) || validText(r.explicacao_pa)));
		});
		for (var n in byN) {
			var qid = byN[n];
			aiReadyMap[qid] = !!ok[qid];
			/* In a live test this button requests the inline explanation. */
			toggleAIChip(n, typeof showInlineAIExplanation == 'function' ? true : aiReadyMap[qid]);
		}
		/* Barra de progresso das explicações IA (aparece no teste e na revisao) */
		if (typeof updateAIExplainProgress == 'function') updateAIExplainProgress();
	}).catch(function () {});
}

/* ================= PRE-FILL SILENCIOSO (lote) =================
   Quando o teste/revision carga, este percorre TODAS as perguntas,
   salta as que ja tem explicacion (explicacao_ok==1) e pide as demais
   em lotes de 10 (5 como resguardo). Se um lote falha, divide por 2
   (menos perguntas); se ainda falha, repe uma a uma SEM imagen.
   Cada explicacion guardase na BD para sempre (saveAIResult). */
var aiExplFillRunning = false;

/* ============ BARRA DE PROGRESSO DAS EXPLICAÇÕES IA ============
   Mostra "explicadas / total" das perguntas carregadas e uma barra
   de progresso. Criada automaticamente (sem depender do markup da
   página), por isso aparece no teste E na revisao, para todos os
   tipos de teste. */
var aiWorkState = {};
function aiWork(items,status,message) {
 items.forEach(function(it){aiWorkState[itemId(it)]={status:status,message:message||'',since:Date.now()};});
 renderAIWork();
}
function aiWorkError(e) {
 var m=String(e && e.message || e);
 if(/404|no endpoints|model.*not found|invalid model/i.test(m))return 'Modelo IA indisponível. Escolha um modelo válido em Configuração IA. Os pedidos foram interrompidos.';
 if(/402|insufficient.*credit|payment/i.test(m))return 'O serviço exige créditos. Verifique o saldo ou escolha um modelo gratuito; nenhum modelo pago foi selecionado automaticamente.';
 if(/401|403|key|auth/i.test(m))return 'Verifique a chave e permissões em Configuração IA.';
 if(/429|quota|rate/i.test(m))return 'Limite do serviço atingido. Aguarde antes de tentar novamente.';
 if(/timeout|network|connect|fetch|ENOTFOUND/i.test(m))return 'Verifique a ligação à Internet e tente novamente.';
 return 'Não foi possível concluir ou guardar a resposta. Tente novamente; se persistir, verifique a configuração IA.';
}
function openAIWork() {
 if(!document.getElementById('aiWorkDialog')){
 var dialog=document.createElement('dialog');dialog.id='aiWorkDialog';dialog.setAttribute('aria-label','Estado das explicações IA');
 dialog.style.cssText='width:min(660px,85vw);max-height:80vh;overflow:auto;border:1px solid #9db5cd;border-radius:14px;padding:24px;background:#f8fafc;color:#193d60;font:15px Segoe UI;z-index:99999';
 dialog.innerHTML='<h2>Explicações IA — estado</h2><p id="aiWorkSummary"></p><div id="aiWorkRows"></div><p>Repetir processa apenas explicações em falta e pode consumir chamadas de IA.</p><button id="aiWorkRetry">Tentar novamente as que faltam</button> <button id="aiWorkConfig">Configuração IA</button> <button id="aiWorkClose">Fechar</button>';
 document.body.appendChild(dialog);
 var style=document.createElement('style');style.textContent='#aiWorkDialog[open]{display:flex!important;flex-direction:column;height:80vh;overflow:hidden!important;box-sizing:border-box;gap:8px}#aiWorkDialog h2,#aiWorkSummary{margin:0;flex-shrink:0}#aiWorkRows{flex:1;min-height:0;overflow:auto}#aiWorkDialog button{flex-shrink:0;padding:8px;border-radius:6px;border:1px solid #8da8bf;background:#193d60;color:white}';document.head.appendChild(style);
 setInterval(function(){if(dialog.open)renderAIWork();},1000);
 document.getElementById('aiWorkRetry').onclick=function(){startExplainFill();renderAIWork();};
 document.getElementById('aiWorkConfig').onclick=function(){alert('Para alterar a chave ou o serviço, termine o teste e abra Configuração IA no menu principal. Depois volte e tente novamente as explicações em falta.');};
 document.getElementById('aiWorkClose').onclick=function(){dialog.close();};
 }
 renderAIWork();document.getElementById('aiWorkDialog').showModal();updateAIExplainProgress();
}
function renderAIWork(){
 var host=document.getElementById('aiWorkRows');if(!host)return;
 var scroll=host.scrollTop,done=0,active=[];host.textContent='';
 collectLoadedQuestions().forEach(function(it){
 var state=aiWorkState[itemId(it)]||{status:'Em espera',message:''};
 var row=document.createElement('p');row.style.cssText='padding:10px;border-bottom:1px solid #ccd9e5;margin:0';
 if(state.status==='Guardada')done++;
 if(state.status==='A processar'){active.push(it.n);row.style.background='#dfedf9';}
 row.textContent='Pergunta '+it.n+' — '+state.status+(state.status==='A processar'?' · '+Math.floor((Date.now()-(state.since||Date.now()))/1000)+' s':'')+(state.message?' · '+state.message:'');
 var preview=document.createElement('small');preview.style.cssText='display:block;margin-top:5px';preview.textContent=String(it.q.pergunta||'').replace(/<[^>]*>/g,'').slice(0,180);row.appendChild(preview);host.appendChild(row);
 });
 host.scrollTop=scroll;document.getElementById('aiWorkSummary').textContent=done+'/'+collectLoadedQuestions().length+' guardadas · '+(aiExplFillRunning?'A aguardar resposta: pergunta '+active.join(', '):'Sem processamento ativo.');
 document.getElementById('aiWorkRetry').disabled=!!aiExplFillRunning;
}
function ensureAIExplainBar() {
	if ($('#aiExplainBar').length) return;
	$('body').append(
		'<div id="aiExplainBar" class="ai-explain-progress" style="display:none;">'
		+ '<span class="ai-ep-label">Explicações IA</span>'
		+ '<div class="ai-ep-track"><div class="ai-ep-fill"></div></div>'
		+ '<span class="ai-ep-count"></span>'
		+ '</div>'
	);
}

var _aiEpTimer = null;
function setAIExplainProgress(have, total) {
	ensureAIExplainBar();
	var bar = $('#aiExplainBar');
	bar.attr({role:'button',tabindex:'0',title:'Ver estado e recuperar erros IA'}).css('cursor','pointer').off('click.aiwork keydown.aiwork').on('click.aiwork',openAIWork).on('keydown.aiwork',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openAIWork();}});
	if (!bar.length) return;
	var pct = total ? Math.round(have * 100 / total) : 0;
	bar.show();
	bar.find('.ai-ep-count').text(have + '/' + total + (have < total ? '  (' + (total - have) + ' em falta)' : '  (completo)'));
	bar.find('.ai-ep-fill').css('width', pct + '%');
	bar.toggleClass('ai-ep-done', have >= total && total > 0);
}

/* Conta as perguntas carregadas e as que ja tem explicacao na BD. */
function updateAIExplainProgress() {
	if (typeof getQuestionForAI != 'function') return;
	var list = collectLoadedQuestions();
	if (!list.length) return;
	var ids = list.map(itemId).join(',');
	if (typeof getQuestionAIStates != 'function') return;
	getQuestionAIStates(ids).then(function (rows) {
		var have = 0;
		rows.forEach(function (r) {
			if (r.explicacao_ok == 1 && (validText(r.explicacao_pt) || validText(r.explicacao_en) || validText(r.explicacao_pa))) have++;
		});
		rows.forEach(function(r){if(r.explicacao_ok == 1 && (validText(r.explicacao_pt)||validText(r.explicacao_en)||validText(r.explicacao_pa)))aiWorkState[r.id]={status:'Guardada',message:''};});
		renderAIWork();
		setAIExplainProgress(have, list.length);
	}).catch(function () {});
}

function collectLoadedQuestions() {
	var list = [];
	if (typeof getQuestionForAI != 'function') return list;
	for (var n = 1; ; n++) {
		var q = getQuestionForAI(n);
		if (!q) break;
		list.push({ n: n, q: q });
	}
	return list;
}

function chunkArray(a, size) {
	var out = [];
	for (var i = 0; i < a.length; i += size) out.push(a.slice(i, i + size));
	return out;
}

function itemId(it) { return it.q.q_id || it.q.id; }

/* Batch requests use the exact SQLite rows too: displayed options can be shuffled. */
async function prepareBatchItems(items) {
	return await Promise.all(items.map(async function (it) {
		var rows = await getAIQuestionSource(itemId(it));
		if (!rows || !rows.length) throw new Error('Pergunta não encontrada na base de dados: ' + itemId(it));
		var source = rows[0];
		source.imagePath = it.q.imagePath || '';
		return { n: it.n, q: source };
	}));
}

function batchPayload(items, useImage) {
	return {
		questions: items.map(function (it) {
			var q = it.q;
			return {
				id: itemId(it),
				question: q.pergunta || '',
				answers: [q.resposta_a || '', q.resposta_b || '', q.resposta_c || '', q.resposta_d || ''],
				correct: String(q.correcta || '').toUpperCase(),
				imagePath: (q.imagePath || '') + (q.imagem || '')
			};
		}),
		useImage: useImage
	};
}

function batchAnswerMatchesDatabase(d, sourceItem) {
	var q = sourceItem.q;
	var answers = [q.resposta_a || '', q.resposta_b || '', q.resposta_c || '', q.resposta_d || ''];
	var index = ['A','B','C','D'].indexOf(String(q.correcta || '').toUpperCase());
	var correctText = index >= 0 ? answers[index] : '';
	var header = '✅ Resposta correta: ' + correctText;
	return !!correctText && String(d && d.explanation_pt || '').trim().indexOf(header) === 0;
}

async function saveBatchResult(item, d) {
	try {
		await saveAIResult(itemId(item), d);
		aiReadyMap[itemId(item)] = true;
		toggleAIChip(item.n, true);
		if (typeof onQuestionTranslated == 'function') onQuestionTranslated(item.n);
		if (typeof updateAIExplainProgress == 'function') updateAIExplainProgress();
	} catch (e) { aiWork([item],'Erro ao guardar',aiWorkError(e)); throw e; }
}

async function tryBatch(items, size, useImage) {
	if (!items.length) return;
	if (typeof window.AI == 'undefined' || typeof window.AI.explainBatch != 'function') { aiWork(items,'Erro','Serviço IA indisponível. Reinicie a aplicação.'); return; }
	aiWork(items,'A processar',useImage?'Com imagem, quando disponível.':'Nova tentativa sem imagem; sinais não podem ser confirmados.');
	try {
		var sourceItems = await prepareBatchItems(items);
		var txt = await window.AI.explainBatch(batchPayload(sourceItems, useImage));
		var arr = JSON.parse(txt);
		if(!Array.isArray(arr) || sourceItems.some(function(it){return !arr.some(function(d){return d && String(d.id)===String(itemId(it)) && validText(d.explanation_pt) && validText(d.explanation_en) && validText(d.explanation_pa) && batchAnswerMatchesDatabase(d, it);});})) throw new Error('Resposta IA sem a resposta correta da base de dados');
		if (arr && Array.isArray(arr)) {
			for (var i = 0; i < arr.length; i++) {
				var d = arr[i];
				if (!d || !d.id) continue;
				for (var j = 0; j < items.length; j++) {
					if (itemId(items[j]) == d.id) { await saveBatchResult(items[j], d); aiWork([items[j]],'Guardada'); break; }
				}
			}
		}
	} catch (e) {
		if(/401|402|403|404|429|no endpoints|invalid model|não configurada/i.test(String(e && e.message || e))) { aiWork(items,'Erro',aiWorkError(e)); throw e; }
		if (items.length > 1) {
			/* menos perguntas por chamada */
			await fillPool(items, Math.max(1, Math.ceil(size / 2)), useImage);
		} else if (useImage) {
			/* unha so pergunta e SEM imagen */
			await fillPool(items, 1, false);
		}
		if(items.length===1 && !useImage) aiWork(items,'Erro',aiWorkError(e));
	}
}

async function fillPool(items, size, useImage) {
	var pools = chunkArray(items, size);
	for (var p = 0; p < pools.length; p++) {
		await tryBatch(pools[p], size, useImage);
	}
}

/* Entrada unica: recolle as perguntas cargadas, salta as que xa tehen
   explicacion na BD e pre-fill das restantes em silencio. */
async function startExplainFill() {
	if (aiExplFillRunning) return;
	aiExplFillRunning = true;
	try {
		/* lista de ids: salta as que xa estan resolto na BD */
		var list = collectLoadedQuestions();
		if (!list.length) { aiExplFillRunning = false; return; }
		var ids = list.map(itemId).join(',');
		var have = {};
		if (typeof getQuestionAIStates == 'function') {
			try {
				var rows = await getQuestionAIStates(ids);
				rows.forEach(function (r) {
					if (r.explicacao_ok == 1 && (validText(r.explicacao_pt) || validText(r.explicacao_en) || validText(r.explicacao_pa))) have[r.id] = true;
				});
			} catch (e) {}
		}
		if (typeof updateAIExplainProgress == 'function') updateAIExplainProgress();
		/* Exactly three sequential batches for the loaded paper. */
		var missing = list.filter(function (it) { return !have[itemId(it)]; });
		await fillPool(missing, Math.max(1, Math.ceil(missing.length / 3)), true);
	} catch (e) { aiWork(collectLoadedQuestions().filter(function(it){return !aiReadyMap[itemId(it)] && (!aiWorkState[itemId(it)] || aiWorkState[itemId(it)].status!=='Guardada');}),'Erro',aiWorkError(e)); }
	aiExplFillRunning = false;
	renderAIWork();
	if (typeof refreshAllAIChips == 'function') refreshAllAIChips();
	if (typeof updateAIExplainProgress == 'function') updateAIExplainProgress();
}

function ensureAIModal() {
	if ($('#aiModal').length) return;
	$('body').append(
		'<div id="aiModal" class="ai-modal-overlay" style="display:none;">'
		+ '<div class="ai-modal">'
		+ '<div class="ai-modal-head">'
		+ '<span class="ai-modal-title">EXPLICAÇÃO <span id="aiModalNum"></span></span>'
		+ '<span class="ai-modal-langs">'
		+ '<span class="ai-tab ai-tab-active" id="aiTabPt" onclick="setAILang(\'pt\')">PT</span>'
		+ '<span class="ai-tab" id="aiTabEn" onclick="setAILang(\'en\')">EN</span>'
		+ '<span class="ai-tab" id="aiTabPa" onclick="setAILang(\'pa\')">ਪੰਜਾਬੀ</span>'
		+ '</span>'
		+ '<span class="ai-modal-close" onclick="closeAIModal()">&#215;</span>'
		+ '</div>'
		+ '<div class="ai-modal-body" id="aiModalBody"></div>'
		+ '<div class="ai-modal-foot" id="aiModalFoot"></div>'
		+ '</div></div>'
	);
}

async function openAIModal(n) {
	if (typeof getQuestionForAI != 'function') return;
	ensureAIModal();
	aiCurrent = n;
	aiLang = 'pt';
	var q = getQuestionForAI(n);
	if (!q) return;
	$('#aiModalNum').html('&mdash; Pergunta ' + n);
	$('#aiModalFoot').html('');
	$('#aiModal').css('display', 'block');
	if (aiDataStore[n] && aiDataStore[n].data) { renderAIModal(); return; }
	$('#aiModalBody').html('<div class="ai-loading">A gerar explicação com IA... (alguns segundos)</div>');
	try {
		var d = await waitForBatchExplanation(q.q_id || q.id);
		if (!d) d = await getQuestionAI(q);
		aiDataStore[n] = { data: d, q: q };
		applyAIToQuestion(q, d);
		if (typeof onQuestionTranslated == 'function') onQuestionTranslated(n);
		renderAIModal();
		$('#aiModalFoot').html('<span class="ai-saved">Guardada permanentemente &mdash; esta pergunta não volta a gastar chamadas de IA.</span>');
	} catch (e) {
		$('#aiModalBody').html('<div class="ai-error">Não foi possível: ' + String(e.message || e).slice(0, 140) + '</div>'
			+ '<div class="ai-cfg-link" onclick="window.location.href=\'ai_config.html\';">Abrir CONFIG IA</div>');
	}
}

function setAILang(l) {
	aiLang = l;
	renderAIModal();
}

function renderAIModal() {
	var holder = aiDataStore[aiCurrent];
	if (!holder || !holder.data) return;
	var d = holder.data;
	var txt = d['explanation_' + aiLang] || d.explanation_pt || d.explanation_en || '';
	if (!txt) txt = '';
	$('#aiModalBody').html('<span class="tts-btn ai-tts" id="aiModalTts">&#128266; Ouvir</span>'
		+ '<div class="ai-text">' + (txt ? txt : '<span class="ai-loading">Sem texto para este idioma.</span>') + '</div>');
	$('#aiModalTts').off('click').on('click', function () {
		speakTTSText(String(txt).replace(/\s+/g, ' '), aiLang);
	});
	$('#aiModal .ai-tab').removeClass('ai-tab-active');
	$('#aiTab' + (aiLang === 'pt' ? 'Pt' : (aiLang === 'en' ? 'En' : 'Pa'))).addClass('ai-tab-active');
}

function closeAIModal() {
	$('#aiModal').css('display', 'none');
}
