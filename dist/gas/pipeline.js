"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRow = exports.processBatch = exports.buildRowValues = void 0;
const constants_1 = require("../constants");
const serp_utils_1 = require("../serp-utils");
const prompt_utils_1 = require("../prompt-utils");
const gemini_utils_1 = require("../gemini-utils");
const domain_utils_1 = require("../domain-utils");
const sheet_utils_1 = require("./sheet-utils");
const buildRowValues = (query, state) => [
    query,
    state.personaPrompt,
    state.status,
    state.checkStatus,
    state.gptRank,
    state.gptUrl,
    state.gptRankWeb,
    state.gptUrlWeb,
    state.gemRank,
    state.gemUrl,
    state.gemRankWeb,
    state.gemUrlWeb,
    state.gptNoAll,
    state.gptWebAll,
    state.gemNoAll,
    state.gemWebAll,
    state.error || '',
];
exports.buildRowValues = buildRowValues;
const processBatch = (cfg, shouldCancel) => {
    const ss = SpreadsheetApp.getActive();
    const rSheet = ss.getSheetByName(sheet_utils_1.SHEETS.RESULTS);
    const prompts = (0, sheet_utils_1.readPrompts)();
    const data = rSheet
        .getRange(2, 1, rSheet.getLastRow() - 1, sheet_utils_1.OUTPUT_HEADERS.length)
        .getValues();
    const pending = data
        .map((row, idx) => ({ row: row, idx }))
        .filter(({ row }) => !row[2] || row[2] === constants_1.RESULT_STATUS.ERROR)
        .slice(0, cfg.batchSize);
    let done = 0;
    let errors = 0;
    pending.forEach(({ row, idx }) => {
        if (shouldCancel())
            throw new Error('Run cancelled');
        const query = row[0];
        try {
            (0, sheet_utils_1.setRowStatus)(rSheet, idx + 2, 'processing');
            const processed = (0, exports.processRow)(String(query), cfg, idx + 2, prompts, state => (0, sheet_utils_1.writeRow)(rSheet, idx + 2, (0, exports.buildRowValues)(query, state)));
            (0, sheet_utils_1.writeRow)(rSheet, idx + 2, (0, exports.buildRowValues)(query, processed));
            (0, sheet_utils_1.setRowStatus)(rSheet, idx + 2, processed.status);
        }
        catch (err) {
            errors++;
            (0, sheet_utils_1.writeRow)(rSheet, idx + 2, [
                query,
                '',
                constants_1.RESULT_STATUS.ERROR,
                'error',
                '-',
                '-',
                '-',
                '-',
                '-',
                '-',
                '-',
                '-',
                '',
                '',
                '',
                '',
                err instanceof Error ? err.message : String(err),
            ]);
            (0, sheet_utils_1.writeLog)('ERROR', `Row failed "${query}": ${err instanceof Error ? err.message : err}`);
            (0, sheet_utils_1.setRowStatus)(rSheet, idx + 2, constants_1.RESULT_STATUS.ERROR);
        }
        done++;
        Utilities.sleep(cfg.rateLimitMs);
    });
    return { done, errors };
};
exports.processBatch = processBatch;
const blankState = () => ({
    personaPrompt: '',
    status: constants_1.RESULT_STATUS.INVISIBLE,
    checkStatus: 'pending',
    gptRank: '-',
    gptUrl: '-',
    gptRankWeb: '-',
    gptUrlWeb: '-',
    gemRank: '-',
    gemUrl: '-',
    gemRankWeb: '-',
    gemUrlWeb: '-',
    gptNoAll: '',
    gptWebAll: '',
    gemNoAll: '',
    gemWebAll: '',
});
const processRow = (query, cfg, rowIndex, prompts, onPartial) => {
    const target = (0, domain_utils_1.normalizeDomain)(cfg.targetDomain);
    const state = blankState();
    const update = (patch) => {
        Object.assign(state, patch);
        onPartial?.({ ...state });
    };
    const persona = generatePersona(query, cfg, prompts);
    (0, sheet_utils_1.writeLog)('INFO', `Persona generated for "${query}" [row ${rowIndex}]: ${persona}`);
    update({ personaPrompt: persona, checkStatus: 'processing' });
    const gptNo = queryOpenAINoTools(persona, cfg, query, prompts);
    update({
        gptNoAll: serializeResults(gptNo),
        gptRank: findRank(gptNo, target).rank,
        gptUrl: findRank(gptNo, target).url,
    });
    const gptWeb = queryOpenAIWithTools(persona, cfg, query, prompts);
    const rWeb = findRank(gptWeb, target);
    update({
        gptWebAll: serializeResults(gptWeb),
        gptRankWeb: rWeb.rank,
        gptUrlWeb: rWeb.url,
    });
    const gemNo = queryGeminiNoGrounding(persona, cfg, query, prompts);
    const rGemNo = findRank(gemNo, target);
    update({
        gemNoAll: serializeResults(gemNo),
        gemRank: rGemNo.rank,
        gemUrl: rGemNo.url,
    });
    const gemWeb = queryGeminiWithGrounding(persona, cfg, query, prompts);
    const rGemWeb = findRank(gemWeb, target);
    update({
        gemWebAll: serializeResults(gemWeb),
        gemRankWeb: rGemWeb.rank,
        gemUrlWeb: rGemWeb.url,
    });
    const r1 = findRank(gptNo, target);
    const r2 = rWeb;
    const r3 = rGemNo;
    const r4 = rGemWeb;
    let status = constants_1.RESULT_STATUS.INVISIBLE;
    if (!gptNo && !gptWeb && !gemNo && !gemWeb)
        status = constants_1.RESULT_STATUS.ERROR;
    else if ([r1, r2, r3, r4].some(r => r.rank !== '-')) {
        status = constants_1.RESULT_STATUS.VISIBLE;
        if (r1.rank === '-' && r3.rank === '-' && (r2.rank !== '-' || r4.rank !== '-')) {
            status = constants_1.RESULT_STATUS.TOOL_ONLY;
        }
    }
    update({ status, checkStatus: 'done' });
    return { ...state };
};
exports.processRow = processRow;
const generatePersona = (keyword, cfg, prompts) => {
    const systemPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.persona_system || '', cfg.userLocation);
    const system = `${systemPrompt}\nIMPORTANT: You MUST return the result in the language code: ${cfg.language.toUpperCase()}`;
    const messages = [
        { role: 'system', content: system },
        { role: 'user', content: keyword },
    ];
    const resp = callOpenAIChat(cfg.openaiKey, cfg.modelOpenai, messages, `Persona for "${keyword}"`);
    if (!resp)
        throw new Error('Persona generation failed');
    return resp;
};
const queryOpenAINoTools = (prompt, cfg, label, prompts) => {
    const systemPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.search_openai_no_tools_system || '', cfg.userLocation);
    const userPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.search_openai_no_tools_user || '', cfg.userLocation, prompt);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
    const content = callOpenAIChat(cfg.openaiKey, cfg.modelOpenai, messages, `OpenAI NoTools for "${label}"`);
    return (0, serp_utils_1.parseSerpJson)(content || '');
};
const queryOpenAIWithTools = (prompt, cfg, label, prompts) => {
    const systemPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.search_openai_with_tools_system || '', cfg.userLocation);
    const userPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.search_openai_with_tools_user || '', cfg.userLocation, prompt);
    const body = {
        model: cfg.modelOpenai,
        input: `${systemPrompt}\n\n${userPrompt}`,
        tools: [
            {
                type: 'web_search',
                user_location: {
                    type: 'approximate',
                    city: (0, sheet_utils_1.cityFromLocation)(cfg.userLocation),
                    country: cfg.countryCode || constants_1.LOCATION_CONFIG.DEFAULT_COUNTRY_CODE,
                },
            },
        ],
    };
    const resp = callOpenAIResponse(cfg.openaiKey, body, `OpenAI WithTools for "${label}"`);
    const text = extractOpenAIResponseText(resp);
    return (0, serp_utils_1.parseSerpJson)(text || '');
};
const queryGeminiNoGrounding = (prompt, cfg, label, prompts) => {
    const textPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.search_gemini_no_grounding || '', cfg.userLocation, prompt);
    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: textPrompt }],
            },
        ],
        generationConfig: { temperature: 0.2 },
    };
    const resp = callGemini(cfg.geminiKey, cfg.modelGemini, body, `Gemini NoGrounding for "${label}"`);
    const text = extractTextFromGemini(resp);
    return (0, serp_utils_1.parseSerpJson)(text || '');
};
const queryGeminiWithGrounding = (prompt, cfg, label, prompts) => {
    const textPrompt = (0, prompt_utils_1.replacePromptPlaceholders)(prompts.search_gemini_with_grounding || '', cfg.userLocation, prompt);
    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: textPrompt }],
            },
        ],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2 },
    };
    const resp = callGemini(cfg.geminiKey, cfg.modelGemini, body, `Gemini WithGrounding for "${label}"`);
    const grounding = (0, gemini_utils_1.extractGeminiGroundingUrls)(resp);
    if (grounding && grounding.length)
        return grounding;
    const text = extractTextFromGemini(resp);
    return (0, serp_utils_1.parseSerpJson)(text || '');
};
const callOpenAIChat = (apiKey, model, messages, label) => {
    const payload = { model, messages };
    const resp = httpPostJson(label || 'OpenAI Chat', 'https://api.openai.com/v1/chat/completions', payload, {
        Authorization: 'Bearer ' + apiKey,
    });
    const choice = resp.choices && resp.choices[0];
    return choice && choice.message && choice.message.content ? choice.message.content : '';
};
const callOpenAIResponse = (apiKey, body, label) => {
    return httpPostJson(label || 'OpenAI Responses', 'https://api.openai.com/v1/responses', body, {
        Authorization: 'Bearer ' + apiKey,
    });
};
const callGemini = (apiKey, model, body, label) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    return httpPostJson(label || `Gemini ${model}`, url, body, {});
};
const httpPostJson = (label, url, payload, headers) => {
    (0, sheet_utils_1.writeLog)('INFO', `${label} → ${url} | payload=${stringifySafe(payload, 1200)}`);
    const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        headers,
        muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    const body = resp.getContentText();
    (0, sheet_utils_1.writeLog)('INFO', `${label} ← HTTP ${code} | body=${body.slice(0, 1200)}${body.length > 1200 ? '... (truncated)' : ''}`);
    if (code >= 300) {
        throw new Error(`HTTP ${code}: ${body}`);
    }
    return JSON.parse(body);
};
const extractTextFromGemini = (resp) => {
    const candidates = resp.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    return parts.map((p) => p.text || '').join('');
};
const extractOpenAIResponseText = (resp) => {
    if (!resp)
        return '';
    if (resp.output_text)
        return resp.output_text;
    if (Array.isArray(resp.output)) {
        for (const item of resp.output) {
            const contentArray = item?.content;
            if (Array.isArray(contentArray)) {
                const text = contentArray.map((c) => c?.text || '').join('');
                if (text.trim())
                    return text;
            }
            const messageContent = item?.message?.content;
            if (Array.isArray(messageContent)) {
                const text = messageContent.map((c) => c?.text || '').join('');
                if (text.trim())
                    return text;
            }
            if (typeof item?.text === 'string' && item.text.trim())
                return item.text;
        }
    }
    return '';
};
const findRank = (results, target) => {
    if (!results || !results.length)
        return { rank: '-', url: '-' };
    const found = results.find(r => r.domain.includes(target) || r.url.includes(target));
    if (found)
        return { rank: found.rank, url: found.url };
    return { rank: '-', url: '-' };
};
const serializeResults = (results) => {
    if (!results || !results.length)
        return '';
    return results.map(r => `${r.rank}: ${r.url}`).join('\n');
};
const stringifySafe = (value, maxLen = 1500) => {
    try {
        const json = JSON.stringify(value);
        return json.length > maxLen ? `${json.slice(0, maxLen)}... (truncated)` : json;
    }
    catch {
        return String(value);
    }
};
