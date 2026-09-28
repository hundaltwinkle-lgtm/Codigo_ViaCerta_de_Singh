/* =====================================================================
   mobile-ai.js — ponte IA para a versão móvel (Capacitor / browser)
   ---------------------------------------------------------------------
   Reimplementa SEMANTICAMENTE o aiService.js (main process do Electron)
   em JavaScript de browser, com o MESMO shape de respostas, para que o
   js/ai.js legado funcione sem alterações:
     window.AI.explain(payload)        -> Promise<string JSON> (igual a
                                          aiService.requestExplain)
     window.AI.explainBatch(payload)   -> Promise<string JSON array>
     window.AI.check(payload)          -> Promise<string JSON>
     window.AI.getConfig()             -> defaults de assets/config/
                                          ai.config.json fundidos com
                                          localStorage['sr_ai_config']
     window.AI.saveConfig(cfg)         -> shape limpo (igual a
                                          aiService.saveConfig), gravado
                                          no localStorage
   Protocolos: OpenAI chat/completions e Gemini generateContent (escolha
   via apiType 'gemini' | 'openai' | 'auto' — auto deteta
   generativelanguage.googleapis.com no endpoint), com CapacitorHttp
   quando disponível e fetch() como alternativa.
   Retry igual ao aiService: max_tokens duplicado até 16000 em resposta
   vazia (finish_reason=length) ou JSON inválido; timeout 120 s; extrai
   o primeiro bloco {...} ([](arrays) na batch).
   ===================================================================== */
(function () {
  'use strict';

  var CONFIG_URL = 'assets/config/ai.config.json';
  var CONFIG_KEY = 'sr_ai_config';
  var TIMEOUT_MS = 120000;

  /* =====================================================================
     SEMANTIC AUTHORITY — funções copiadas VERBATIM do aiService.js
     (não editar: o texto do prompt tem de ser byte-idêntico ao da app
     de referência). Gerado por tools/gen_mobile_ai.js.
     ===================================================================== */
  const EXPLANATION_RULES = "EXPLANATION RULES:\n- DATABASE SOURCE OF TRUTH: the DATABASE CORRECT LETTER and CORRECT ANSWER TEXT are supplied directly from SQLite for this exact question record. Copy that answer text exactly after the correct-answer label. Do not infer, validate, replace, reorder, translate into a different answer, or override it from the question, image, general knowledge, or a displayed/shuffled answer order.\n- The app may shuffle A/B/C/D. NEVER mention answer letters in explanations. Refer to answers only by their actual text or meaning.\n- Start each explanation with the correct answer:\n  Portuguese: ✅ Resposta correta: <correct answer text>.\n  English: ✅ Correct answer: <correct answer text>.\n  Punjabi: ✅ ਸਹੀ ਜਵਾਬ: <correct answer text>.\n- Then explain WHY it is correct using the relevant driving rule, sign meaning, priority rule, safety principle or technical concept.\n- When useful, briefly explain an important wording distinction such as always/frequently, must/may, permitted/prohibited, before/after, inside/outside, left/right, stopping/parking or priority/give way. Do not identify wrong answers by letter.\n- Do not merely repeat the answer. Teach the principle so the learner can recognise similar questions.\n- Normally use 2-4 concise sentences after the correct-answer line; use up to 5 only when necessary.\n- Do not invent legal article numbers, sign codes, speed limits, distances, penalties, vehicle weights, supplementary plates or unsupported legal requirements.\n- If an image is supplied, use it only when it materially helps. Describe only clearly visible and relevant signs, shapes, colours, symbols, markings, vehicles, signals or road conditions. Do not invent unseen details.\n- If a relevant sign is clearly visible, explain its type, relevant shape/colour/symbol, meaning and required or appropriate driver action when useful.\n- If the image is unclear or irrelevant, explain using the question and supplied correct answer without unnecessary comments about image quality.\n- Portuguese must be European Portuguese (pt-PT). English must use clear UK/European driving terminology. Punjabi must be natural Gurmukhi.\n- LANGUAGE CONSISTENCY: Portuguese, English and Punjabi explanations must contain the SAME information, in the SAME sentence order, with the SAME level of detail. Generate one explanation conceptually, then render the same explanation faithfully in all three languages.\n\nSTYLE EXAMPLE:\nQuestion: This sign indicates the approach:\nCorrect answer: Of a stretch of road where side wind is frequent.\nImage: triangular warning sign with a windsock symbol.\nDesired style:\n{\"explanation_pt\":\"✅ Resposta correta: De um troço de via em que é frequente a ação de vento lateral. Este sinal triangular de perigo com uma manga de vento avisa da aproximação de um troço onde o vento lateral é frequente. O vento lateral pode afetar a direção e a estabilidade do veículo, sobretudo em motociclos e veículos de grande altura. O sinal não significa que exista vento permanentemente, mas que este risco ocorre com frequência nesse troço.\",\"explanation_en\":\"✅ Correct answer: Of a stretch of road where side wind is frequent. This triangular warning sign with a windsock warns of the approach to a stretch where side wind is frequent. Side wind can affect the direction and stability of the vehicle, especially motorcycles and high-sided vehicles. The sign does not mean that wind is permanently present, but that this risk occurs frequently on that stretch.\",\"explanation_pa\":\"✅ ਸਹੀ ਜਵਾਬ: ਸੜਕ ਦਾ ਉਹ ਹਿੱਸਾ ਜਿੱਥੇ ਪਾਸੇ ਤੋਂ ਹਵਾ ਅਕਸਰ ਚੱਲਦੀ ਹੈ। ਹਵਾ ਦੀ ਥੈਲੀ ਵਾਲਾ ਇਹ ਤਿਕੋਣਾ ਚੇਤਾਵਨੀ ਸੰਕੇਤ ਉਸ ਸੜਕ ਦੇ ਹਿੱਸੇ ਦੇ ਨੇੜੇ ਪਹੁੰਚਣ ਦੀ ਚੇਤਾਵਨੀ ਦਿੰਦਾ ਹੈ ਜਿੱਥੇ ਪਾਸੇ ਤੋਂ ਹਵਾ ਅਕਸਰ ਚੱਲਦੀ ਹੈ। ਪਾਸੇ ਦੀ ਹਵਾ ਵਾਹਨ ਦੀ ਦਿਸ਼ਾ ਅਤੇ ਸਥਿਰਤਾ ਨੂੰ ਪ੍ਰਭਾਵਿਤ ਕਰ ਸਕਦੀ ਹੈ, ਖਾਸ ਕਰਕੇ ਮੋਟਰਸਾਈਕਲਾਂ ਅਤੇ ਉੱਚੇ ਵਾਹਨਾਂ ਨੂੰ। ਇਸ ਸੰਕੇਤ ਦਾ ਮਤਲਬ ਇਹ ਨਹੀਂ ਕਿ ਉੱਥੇ ਹਮੇਸ਼ਾਂ ਹਵਾ ਹੁੰਦੀ ਹੈ, ਸਗੋਂ ਇਹ ਕਿ ਉਸ ਸੜਕ ਦੇ ਹਿੱਸੇ ਵਿੱਚ ਇਹ ਖਤਰਾ ਅਕਸਰ ਹੁੰਦਾ ਹੈ।\"}\n";

function getCorrectAnswerText(answers, correct) {
    const letters = ['A', 'B', 'C', 'D'];

    const idx = letters.indexOf(
        String(correct || '')
            .trim()
            .toUpperCase()
    );

    return (
        idx >= 0 &&
        answers &&
        answers[idx] != null
    )
        ? String(answers[idx]).trim()
        : '';
}

function buildPrompt(payload) {
    const letters = [
        'A',
        'B',
        'C',
        'D'
    ];

    const answers = letters
        .map((letter, index) => {
            if (
                payload.answers &&
                payload.answers[index]
            ) {
                return (
                    letter +
                    ': ' +
                    payload.answers[index]
                );
            }

            return null;
        })
        .filter(Boolean)
        .join('\n');

    const correctText =
        getCorrectAnswerText(
            payload.answers,
            payload.correct
        );

    return (
        'You are given a Portuguese driving-theory exam question and, when available, its road-sign/situation image.\n\n' +

        'QUESTION (Portuguese):\n' +
        (payload.question || '') +
        '\n\n' +

        'ANSWERS:\n' +
        answers +
        '\n\n' +

        'DATABASE CORRECT LETTER: ' +
        (payload.correct || '') +
        '\n' +

        'CORRECT ANSWER TEXT (Portuguese): ' +
        correctText +
        '\n\n' +

        'Tasks:\n' +

        '1. Translate the question and every non-empty answer into English using accurate UK/European driving-theory terminology.\n' +

        '2. Translate the same question and answers into natural Punjabi in Gurmukhi script.\n' +

        '3. Produce explanation_pt, explanation_en and explanation_pa using the rules below.\n\n' +

        EXPLANATION_RULES +

        '\nReturn ONLY valid JSON with exactly these keys (no markdown, no extra text):\n' +

        '{"question_en":"","answer_a_en":"","answer_b_en":"","answer_c_en":"","answer_d_en":"","question_pa":"","answer_a_pa":"","answer_b_pa":"","answer_c_pa":"","answer_d_pa":"","explanation_pt":"","explanation_en":"","explanation_pa":""}'
    );
}

function buildBatchPrompt(
    questions
) {
    const letters = [
        'A',
        'B',
        'C',
        'D'
    ];

    const blocks =
        questions
            .map(
                (
                    question,
                    index
                ) => {
                    const answers =
                        letters
                            .map(
                                (
                                    letter,
                                    answerIndex
                                ) => {
                                    if (
                                        question.answers &&
                                        question.answers[
                                            answerIndex
                                        ] &&
                                        String(
                                            question.answers[
                                                answerIndex
                                            ]
                                        ).trim() !==
                                        ''
                                    ) {
                                        return (
                                            letter +
                                            ': ' +
                                            question.answers[
                                                answerIndex
                                            ]
                                        );
                                    }

                                    return null;
                                }
                            )
                            .filter(
                                Boolean
                            )
                            .join(
                                '\n'
                            );

                    const correctText =
                        getCorrectAnswerText(
                            question.answers,
                            question.correct
                        );

                    return (
                        '--- Question ' +
                        (
                            index +
                            1
                        ) +
                        ' (id=' +
                        question.id +
                        ') ---\n' +

                        'QUESTION:\n' +
                        (
                            question.question ||
                            ''
                        ) +
                        '\n' +

                        'ANSWERS:\n' +
                        answers +
                        '\n' +

                        'DATABASE CORRECT LETTER: ' +
                        (
                            question.correct ||
                            ''
                        ) +
                        '\n' +

                        'CORRECT ANSWER TEXT (Portuguese): ' +
                        correctText
                    );
                }
            )
            .join(
                '\n\n'
            );

    return (
        'You are given a set of Portuguese driving-theory exam questions, each optionally with road-sign/situation images.\n\n' +

        'QUESTIONS:\n' +
        blocks +
        '\n\n' +

        'For EACH question:\n' +

        '1. Translate the question and every non-empty answer into English using accurate UK/European driving-theory terminology.\n' +

        '2. Translate the same question and answers into natural Punjabi in Gurmukhi script.\n' +

        '3. Produce explanation_pt, explanation_en and explanation_pa using the SAME rules below. Never mix information between questions.\n\n' +

        EXPLANATION_RULES +

        '\nReturn ONLY valid JSON: an ARRAY with exactly ' +
        questions.length +
        ' objects, ONE per question, IN THE SAME ORDER. Preserve each id exactly. Each object has exactly these keys:\n' +

        '{"id":<int>,"question_en":"","answer_a_en":"","answer_b_en":"","answer_c_en":"","answer_d_en":"","question_pa":"","answer_a_pa":"","answer_b_pa":"","answer_c_pa":"","answer_d_pa":"","explanation_pt":"","explanation_en":"","explanation_pa":""}\n' +

        'No markdown, no extra text.'
    );
}

function buildCheckPrompt(
    payload
) {
    const list =
        (
            payload &&
            payload.questions &&
            payload.questions.length
        )
            ? payload.questions
            : [
                payload ||
                {}
            ];

    const input =
        list.map(
            question => {
                const item = {
                    id:
                        question.id,

                    pt: {
                        q:
                            question.pergunta ||
                            ''
                    },

                    en: {
                        q:
                            question.pergunta_en ||
                            ''
                    },

                    pa: {
                        q:
                            question.pergunta_pa ||
                            ''
                    }
                };

                [
                    'a',
                    'b',
                    'c',
                    'd'
                ].forEach(
                    letter => {
                        if (
                            question[
                                'resposta_' +
                                letter
                            ] &&
                            String(
                                question[
                                    'resposta_' +
                                    letter
                                ]
                            ).trim() !==
                            ''
                        ) {
                            item.pt[
                                letter
                            ] =
                                question[
                                    'resposta_' +
                                    letter
                                ];
                        }

                        if (
                            question[
                                'resposta_' +
                                letter +
                                '_en'
                            ] &&
                            String(
                                question[
                                    'resposta_' +
                                    letter +
                                    '_en'
                                ]
                            ).trim() !==
                            ''
                        ) {
                            item.en[
                                letter
                            ] =
                                question[
                                    'resposta_' +
                                    letter +
                                    '_en'
                                ];
                        }

                        if (
                            question[
                                'resposta_' +
                                letter +
                                '_pa'
                            ] &&
                            String(
                                question[
                                    'resposta_' +
                                    letter +
                                    '_pa'
                                ]
                            ).trim() !==
                            ''
                        ) {
                            item.pa[
                                letter
                            ] =
                                question[
                                    'resposta_' +
                                    letter +
                                    '_pa'
                                ];
                        }
                    }
                );

                return item;
            }
        );

    return (
        'You are a Portuguese driving-theory exam expert and a professional translator.\n\n' +

        'INPUT: a JSON array with ' +
        input.length +
        ' question(s). Each entry has the Portuguese original ("pt"), the English translation ("en") and the Punjabi translation ("pa") of the question ("q") and answers ("a","b","c","d").\n' +

        JSON.stringify(
            input
        ) +

        '\n\nTASK: for EACH entry check if the English and Punjabi versions are accurate, complete translations of the Portuguese (same meaning, correct driving-theory terminology, Punjabi in Gurmukhi, nothing missing, no Portuguese left over).\n\n' +

        'Reply ONLY with a JSON array, one object per input entry, in the SAME order, using the same ids:\n' +

        '[{"id":123,"en":"ok|fix|missing","pa":"ok|fix|missing","nota":"short reason in Portuguese, max 100 chars"}]\n' +

        'Use "ok" = correct, "fix" = wrong or partial, "missing" = empty. No markdown, no extra text.'
    );
}

function buildRequestBody(cfg, prompt) {
    const safePrompt =
        String(prompt || '');

    const systemMessage =
        'You are a Portuguese driving-theory instructor. ' +
        'The supplied correct answer is authoritative. ' +
        'Never refer to answer letters inside explanations. ' +
        'Keep Portuguese, English and Punjabi explanations equivalent in content and sentence order. ' +
        'Reply ONLY with the requested valid JSON.' +
        (cfg.customPrompt ? '\nAdditional app instruction (never override the database answer or Portuguese source): ' + String(cfg.customPrompt) : '');

    if (isGemini(cfg)) {
        return {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: safePrompt
                        }
                    ]
                }
            ],

            systemInstruction: {
                parts: [
                    {
                        text: systemMessage
                    }
                ]
            },

            generationConfig: {
                temperature:
                    cfg.temperature,

                maxOutputTokens:
                    cfg.maxTokens
            }
        };
    }

    /*
       IMPORTANT:
       Text-only OpenRouter/OpenAI requests use
       content: "plain string"

       When an image is added,
       addImageToBody() converts it to the
       multimodal content array.
    */

    return {
        model:
            cfg.model ||
            'gpt-4o-mini',

        temperature:
            cfg.temperature,

        max_tokens:
            cfg.maxTokens,

        messages: [
            {
                role: 'system',
                content:
                    systemMessage
            },

            {
                role: 'user',
                content:
                    safePrompt
            }
        ]
    };
}

function addImageToBody(
    body,
    cfg,
    imageBase64
) {
    if (!imageBase64) {
        return;
    }

    if (isGemini(cfg)) {
        body
            .contents[0]
            .parts
            .push({
                inline_data: {
                    mime_type:
                        'image/jpeg',

                    data:
                        String(
                            imageBase64
                        )
                }
            });

        return;
    }

    const current =
        body.messages &&
        body.messages[1]
            ? body.messages[1].content
            : '';

    let textPart = '';

    if (
        typeof current ===
        'string'
    ) {
        textPart =
            current;
    }

    else if (
        Array.isArray(
            current
        )
    ) {
        const found =
            current.find(
                item =>
                    item &&
                    item.type === 'text' &&
                    typeof item.text ===
                    'string'
            );

        textPart =
            found
                ? found.text
                : '';
    }

    body.messages[1].content = [
        {
            type: 'text',
            text:
                String(
                    textPart || ''
                )
        },

        {
            type: 'image_url',

            image_url: {
                url:
                    'data:image/jpeg;base64,' +
                    String(
                        imageBase64
                    )
            }
        }
    ];
}

function extractJsonBlock(
    text
) {
    let result =
        String(
            text || ''
        ).trim();

    result = result
        .replace(
            /^```(json)?\s*/i,
            ''
        )
        .replace(
            /```\s*$/,
            ''
        )
        .trim();

    const start =
        result.indexOf(
            '{'
        );

    const end =
        result.lastIndexOf(
            '}'
        );

    if (
        start >= 0 &&
        end > start
    ) {
        result =
            result.slice(
                start,
                end + 1
            );
    }

    return result;
}

function extractJsonArray(
    text
) {
    let result =
        String(
            text || ''
        ).trim();

    result = result
        .replace(
            /^```(json)?\s*/i,
            ''
        )
        .replace(
            /```\s*$/,
            ''
        )
        .trim();

    const start =
        result.indexOf(
            '['
        );

    const end =
        result.lastIndexOf(
            ']'
        );

    if (
        start >= 0 &&
        end > start
    ) {
        return result.slice(
            start,
            end + 1
        );
    }

    const objectStart =
        result.indexOf(
            '{'
        );

    const objectEnd =
        result.lastIndexOf(
            '}'
        );

    if (
        objectStart >= 0 &&
        objectEnd > objectStart
    ) {
        return (
            '[' +
            result.slice(
                objectStart,
                objectEnd + 1
            ) +
            ']'
        );
    }

    return result;
}

function extractTextFromResponse(
    cfg,
    response
) {
    if (isGemini(cfg)) {
        const candidate =
            response.candidates &&
            response.candidates[0];

        const part =
            candidate &&
            candidate.content &&
            candidate.content.parts &&
            candidate.content.parts[0];

        return (
            part &&
            part.text
        ) || '';
    }

    return (
        response.choices &&
        response.choices[0] &&
        response.choices[0].message
    )
        ? (
            response
                .choices[0]
                .message
                .content ||
            ''
        )
        : '';
}

function finishReason(
    cfg,
    response
) {
    if (isGemini(cfg)) {
        const candidate =
            response.candidates &&
            response.candidates[0];

        return (
            candidate &&
            candidate.finishReason
        ) || '';
    }

    return (
        response.choices &&
        response.choices[0] &&
        response.choices[0].finish_reason
    ) || '';
}

function isGemini(cfg) {
    if (cfg && cfg.apiType === 'gemini') {
        return true;
    }

    if (cfg && cfg.apiType === 'openai') {
        return false;
    }

    return /generativelanguage\.googleapis\.com/.test(
        (cfg && cfg.endpoint) || ''
    );
}



  /* =====================================================================
     Config: localStorage 'sr_ai_config' fundido sobre os defaults
     bundled (assets/config/ai.config.json).
     ===================================================================== */
  var bundledConfigPromise = null;

  function bundledConfig() {
    if (!bundledConfigPromise) {
      bundledConfigPromise = fetch(CONFIG_URL)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .catch(function () {
          return {};
        });
    }
    return bundledConfigPromise;
  }

  async function loadConfig() {
    var def = await bundledConfig();
    var saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
    } catch (e) {
      saved = null;
    }
    return Object.assign({}, def, saved || {});
  }

  function cleanShape(cfg) {
    return {
      endpoint: String(cfg.endpoint || '').trim(),
      model: String(cfg.model || '').trim(),
      apiKey: String(cfg.apiKey || '').trim(),
      apiType:
        (cfg.apiType === 'gemini' || cfg.apiType === 'openai')
          ? cfg.apiType
          : 'auto',
      includeImage: cfg.includeImage !== false,
      customPrompt: String(cfg.customPrompt || '').trim().slice(0, 4000),
      maxTokens: Number(cfg.maxTokens) || 1800,
      temperature:
        (cfg.temperature !== undefined)
          ? Number(cfg.temperature)
          : 0.2
    };
  }

  async function saveConfig(cfg) {
    var merged = Object.assign({}, await loadConfig(), cfg || {});
    var clean = cleanShape(merged);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
    } catch (e) {
      console.warn('[mobile-ai] Não foi possível gravar a configuração:', e && e.message || e);
    }
    return clean;
  }

  /* =====================================================================
     HTTP: CapacitorHttp quando disponível, fetch() caso contrário.
     ===================================================================== */

  /* buildRequestOptions mobile: devolve {url, headers}. O aiService
     original usa https/http + Buffer; aqui apenas calculamos URL e
     cabeçalhos (o Content-Length é tratado pelo runtime). */
  function buildRequestOptions(cfg, bodyStr) {
    var endpoint = String(
      cfg.endpoint || 'https://api.openai.com/v1/chat/completions'
    ).replace(/\/+$/, '');

    var url;

    if (isGemini(cfg)) {
      url = endpoint +
        '/models/' +
        encodeURIComponent(cfg.model || 'gemini-2.5-flash-lite') +
        ':generateContent?key=' +
        encodeURIComponent(String(cfg.apiKey || ''));
    } else {
      if (!/\/chat\/completions$/.test(endpoint)) {
        endpoint += '/chat/completions';
      }
      url = endpoint;
    }

    var headers = {
      'Content-Type': 'application/json'
    };
    if (!isGemini(cfg)) {
      headers.Authorization = 'Bearer ' + cfg.apiKey;
    }

    return { url: url, headers: headers };
  }

  function parseHttpPayload(status, raw) {
    if (status >= 400) {
      var message = 'AI HTTP ' + status;
      try {
        var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        message += ': ' + (
          (parsed && parsed.error && parsed.error.message) ||
          String(raw).slice(0, 150)
        );
      } catch (e) {
        message += ': ' + String(raw).slice(0, 150);
      }
      throw new Error(message);
    }
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e2) {
      throw new Error('Bad AI response: ' + String(raw).slice(0, 200));
    }
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('AI timeout (120s)')); }, ms);
      promise.then(
        function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); }
      );
    });
  }

  function capacitorHttp() {
    try {
      if (typeof window === 'undefined' || !window.Capacitor) return null;
      var p = window.Capacitor.Plugins;
      if (!p || !p.CapacitorHttp || typeof p.CapacitorHttp.request !== 'function') return null;
      return p.CapacitorHttp;
    } catch (e) {
      return null;
    }
  }

  async function postJson(cfg, bodyStr) {
    var requestInfo;
    try {
      requestInfo = buildRequestOptions(cfg, bodyStr);
    } catch (e) {
      throw new Error('Endpoint de IA inválido no CONFIG IA.');
    }

    var http = capacitorHttp();
    if (http) {
      var res = await withTimeout(http.request({
        method: 'POST',
        url: requestInfo.url,
        headers: requestInfo.headers,
        data: bodyStr,
        connectTimeout: 30000,
        readTimeout: TIMEOUT_MS
      }), TIMEOUT_MS);
      return parseHttpPayload(res && res.status, res && res.data);
    }

    var resp = await withTimeout(fetch(requestInfo.url, {
      method: 'POST',
      headers: requestInfo.headers,
      body: bodyStr
    }), TIMEOUT_MS);
    var text = await resp.text();
    return parseHttpPayload(resp.status, text);
  }

  function bytesToBase64(bytes) {
    var binary = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  /* Imagem da pergunta: assets/testes_exame/tipo_<t>_cat_<c>/<imagem>.jpg.
     Se faltar (404) ou falhar, devolve null — a chamada segue sem imagem
     (equivalente ao fs.existsSync do aiService). */
  async function fetchImageBase64(imagePath) {
    try {
      var res = await fetch('assets/' + String(imagePath || '') + '.jpg');
      if (!res.ok) return null;
      var buf = await res.arrayBuffer();
      return bytesToBase64(new Uint8Array(buf));
    } catch (e) {
      return null;
    }
  }

  /* =====================================================================
     Pedidos — replicam requestExplain / requestExplainBatch / requestCheck
     do aiService.js (retry com max_tokens duplicado, mesmas mensagens).
     ===================================================================== */
  async function requestExplain(payload) {
    var cfg = await loadConfig();

    if (!cfg || !cfg.apiKey || cfg.apiKey === 'PASTE_YOUR_API_KEY_HERE') {
      throw new Error('AI não configurada - abra "CONFIG IA" (canto superior direito) e introduza a chave.');
    }

    var maxTokens = Number(cfg.maxTokens) > 0 ? Number(cfg.maxTokens) : 3000;
    var lastError = null;

    for (var attempt = 0; attempt < 3; attempt++) {
      var currentConfig = Object.assign({}, cfg, { maxTokens: maxTokens });
      var body = buildRequestBody(currentConfig, buildPrompt(payload));

      if (currentConfig.includeImage !== false && payload && payload.imagePath) {
        var imageBase64 = await fetchImageBase64(String(payload.imagePath));
        if (imageBase64) addImageToBody(body, currentConfig, imageBase64);
      }

      var response = await postJson(currentConfig, JSON.stringify(body));
      var text = extractJsonBlock(extractTextFromResponse(currentConfig, response));

      if (text) {
        try {
          JSON.parse(text);
          return text;
        } catch (e) {
          lastError = new Error('AI devolveu JSON inválido: ' + text.slice(0, 150));
        }
      } else {
        lastError = new Error('A IA devolveu resposta vazia (finish=' +
          (finishReason(currentConfig, response) || '?') +
          '). Aumente o "Máximo de tokens" no CONFIG IA.');
      }

      maxTokens *= 2;
      if (maxTokens > 16000) break;
    }

    throw (lastError || new Error('AI sem resposta'));
  }

  async function requestExplainBatch(payload) {
    var cfg = await loadConfig();

    if (!cfg || !cfg.apiKey || cfg.apiKey === 'PASTE_YOUR_API_KEY_HERE') {
      throw new Error('AI não configurada - abra "CONFIG IA" (canto superior direito) e introduza a chave.');
    }

    var questions = (payload && payload.questions && payload.questions.length)
      ? payload.questions
      : [];

    if (!questions.length) {
      throw new Error('Batch vazio');
    }

    var useImage = payload && payload.useImage !== false;

    var maxTokens =
      (Number(cfg.maxTokens) > 0 ? Number(cfg.maxTokens) : 3000) +
      900 * questions.length;
    var lastError = null;

    for (var attempt = 0; attempt < 3; attempt++) {
      var currentConfig = Object.assign({}, cfg, { maxTokens: maxTokens });
      var body = buildRequestBody(currentConfig, buildBatchPrompt(questions));

      if (useImage) {
        for (var qi = 0; qi < questions.length; qi++) {
          var question = questions[qi];
          if (!question || !question.imagePath) continue;
          var b64 = await fetchImageBase64(String(question.imagePath));
          if (!b64) continue;
          addImageToBody(body, currentConfig, b64);
        }
      }

      var response = await postJson(currentConfig, JSON.stringify(body));
      var text = extractJsonArray(extractTextFromResponse(currentConfig, response));

      if (text) {
        try {
          var result = JSON.parse(text);
          if (Array.isArray(result) && result.length === questions.length) {
            return JSON.stringify(result);
          }
          lastError = new Error('Batch: a IA devolveu ' +
            (Array.isArray(result) ? result.length : '?') +
            ' de ' + questions.length + ' resultados');
        } catch (e) {
          lastError = new Error('Batch: JSON inválido: ' + text.slice(0, 150));
        }
      } else {
        lastError = new Error('AI devolveu resposta vazia (finish=' +
          (finishReason(currentConfig, response) || '?') +
          '). Aumente o "Máximo de tokens" no CONFIG IA.');
      }

      maxTokens *= 2;
      if (maxTokens > 16000) break;
    }

    throw (lastError || new Error('AI sem resposta'));
  }

  async function requestCheck(payload) {
    var cfg = await loadConfig();

    if (!cfg || !cfg.apiKey || cfg.apiKey === 'PASTE_YOUR_API_KEY_HERE') {
      throw new Error('AI nao configurada - abra "CONFIG IA" e introduza a chave.');
    }

    var count = (payload && payload.questions && payload.questions.length)
      ? payload.questions.length
      : 1;

    var maxTokens = 400 + 60 * count;
    var lastError = null;

    for (var attempt = 0; attempt < 3; attempt++) {
      var currentConfig = Object.assign({}, cfg, { maxTokens: maxTokens });
      var body = buildRequestBody(currentConfig, buildCheckPrompt(payload));

      var response = await postJson(currentConfig, JSON.stringify(body));
      var text = extractJsonBlock(extractTextFromResponse(currentConfig, response));

      if (text) {
        try {
          JSON.parse(text);
          return text;
        } catch (e) {
          lastError = new Error('JSON invalido: ' + text.slice(0, 120));
        }
      } else {
        lastError = new Error('resposta vazia (finish=' +
          (finishReason(currentConfig, response) || '?') + ')');
      }

      maxTokens *= 2;
      if (maxTokens > 50000) break;
    }

    throw (lastError || new Error('AI sem resposta'));
  }

  /* ===================================================================== */
  window.AI = {
    explain: requestExplain,
    explainBatch: requestExplainBatch,
    check: requestCheck,
    getConfig: loadConfig,
    saveConfig: saveConfig
  };
  /* ===================================================================== */
})();
