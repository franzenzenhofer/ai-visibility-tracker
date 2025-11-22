import { RESULT_STATUS, PROCESSING_CONSTANTS, LOCATION_CONFIG, ResultStatus } from '../constants';
import {
  parseSerpJson,
  replacePromptPlaceholders,
  extractGeminiGroundingUrls,
  normalizeDomain,
} from '../utils';
import { GasConfig, ProcessedRow, SerpResult } from './models';
import { writeRow, setRowStatus, writeLog, OUTPUT_HEADERS, SHEETS, cityFromLocation, readPrompts } from './sheet-utils';

export const buildRowValues = (query: string, state: ProcessedRow) => [
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

export const processBatch = (cfg: GasConfig, shouldCancel: () => boolean) => {
  const ss = SpreadsheetApp.getActive();
  const rSheet = ss.getSheetByName(SHEETS.RESULTS);
  const prompts = readPrompts();
  const data = rSheet
    .getRange(2, 1, rSheet.getLastRow() - 1, OUTPUT_HEADERS.length)
    .getValues() as unknown[][];
  const pending = data
    .map((row, idx) => ({ row: row as unknown[], idx }))
    .filter(({ row }) => !row[2] || row[2] === RESULT_STATUS.ERROR)
    .slice(0, cfg.batchSize);

  let done = 0;
  let errors = 0;

  pending.forEach(({ row, idx }: { row: unknown[]; idx: number }) => {
    if (shouldCancel()) throw new Error('Run cancelled');

    const query = row[0] as string;
    try {
      setRowStatus(rSheet, idx + 2, 'processing');
      const processed = processRow(
        String(query),
        cfg,
        idx + 2,
        prompts,
        state => writeRow(rSheet, idx + 2, buildRowValues(query, state))
      );
      writeRow(rSheet, idx + 2, buildRowValues(query, processed));
      setRowStatus(rSheet, idx + 2, processed.status);
    } catch (err) {
      errors++;
      writeRow(rSheet, idx + 2, [
        query,
        '',
        RESULT_STATUS.ERROR,
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
      writeLog('ERROR', `Row failed "${query}": ${err instanceof Error ? err.message : err}`);
      setRowStatus(rSheet, idx + 2, RESULT_STATUS.ERROR);
    }

    done++;
    Utilities.sleep(cfg.rateLimitMs);
  });

  return { done, errors };
};

const blankState = (): ProcessedRow => ({
  personaPrompt: '',
  status: RESULT_STATUS.INVISIBLE,
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

export const processRow = (
  query: string,
  cfg: GasConfig,
  rowIndex: number,
  prompts: Record<string, string>,
  onPartial?: (state: ProcessedRow) => void
): ProcessedRow => {
  const target = normalizeDomain(cfg.targetDomain);
  const state = blankState();
  const update = (patch: Partial<ProcessedRow>) => {
    Object.assign(state, patch);
    onPartial?.({ ...state });
  };

  const persona = generatePersona(query, cfg, prompts);
  writeLog('INFO', `Persona generated for "${query}" [row ${rowIndex}]: ${persona}`);
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

  let status: ResultStatus = RESULT_STATUS.INVISIBLE;
  if (!gptNo && !gptWeb && !gemNo && !gemWeb) status = RESULT_STATUS.ERROR;
  else if ([r1, r2, r3, r4].some(r => r.rank !== '-')) {
    status = RESULT_STATUS.VISIBLE;
    if (r1.rank === '-' && r3.rank === '-' && (r2.rank !== '-' || r4.rank !== '-')) {
      status = RESULT_STATUS.TOOL_ONLY;
    }
  }

  update({ status, checkStatus: 'done' });
  return { ...state };
};

const generatePersona = (keyword: string, cfg: GasConfig, prompts: Record<string, string>): string => {
  const systemPrompt = replacePromptPlaceholders(
    prompts.persona_system || '',
    cfg.userLocation
  );
  const system = `${systemPrompt}\nIMPORTANT: You MUST return the result in the language code: ${cfg.language.toUpperCase()}`;
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: keyword },
  ];
  const resp = callOpenAIChat(cfg.openaiKey, cfg.modelOpenai, messages, `Persona for "${keyword}"`);
  if (!resp) throw new Error('Persona generation failed');
  return resp;
};

const queryOpenAINoTools = (prompt: string, cfg: GasConfig, label: string, prompts: Record<string, string>): SerpResult[] | null => {
  const systemPrompt = replacePromptPlaceholders(
    prompts.search_openai_no_tools_system || '',
    cfg.userLocation
  );
  const userPrompt = replacePromptPlaceholders(
    prompts.search_openai_no_tools_user || '',
    cfg.userLocation,
    prompt
  );

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const content = callOpenAIChat(cfg.openaiKey, cfg.modelOpenai, messages, `OpenAI NoTools for "${label}"`);
  return parseSerpJson(content || '');
};

const queryOpenAIWithTools = (prompt: string, cfg: GasConfig, label: string, prompts: Record<string, string>): SerpResult[] | null => {
  const systemPrompt = replacePromptPlaceholders(
    prompts.search_openai_with_tools_system || '',
    cfg.userLocation
  );
  const userPrompt = replacePromptPlaceholders(
    prompts.search_openai_with_tools_user || '',
    cfg.userLocation,
    prompt
  );

  const body = {
    model: cfg.modelOpenai,
    input: `${systemPrompt}\n\n${userPrompt}`,
    tools: [
      {
        type: 'web_search',
        user_location: {
          type: 'approximate',
          city: cityFromLocation(cfg.userLocation),
          country: cfg.countryCode || LOCATION_CONFIG.DEFAULT_COUNTRY_CODE,
        },
      },
    ],
  };

  const resp = callOpenAIResponse(cfg.openaiKey, body, `OpenAI WithTools for "${label}"`);
  const text = extractOpenAIResponseText(resp);
  return parseSerpJson(text || '');
};

const queryGeminiNoGrounding = (prompt: string, cfg: GasConfig, label: string, prompts: Record<string, string>): SerpResult[] | null => {
  const textPrompt = replacePromptPlaceholders(
    prompts.search_gemini_no_grounding || '',
    cfg.userLocation,
    prompt
  );
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
  return parseSerpJson(text || '');
};

const queryGeminiWithGrounding = (prompt: string, cfg: GasConfig, label: string, prompts: Record<string, string>): SerpResult[] | null => {
  const textPrompt = replacePromptPlaceholders(
    prompts.search_gemini_with_grounding || '',
    cfg.userLocation,
    prompt
  );
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
  const grounding = extractGeminiGroundingUrls(resp as unknown as Record<string, unknown>);
  if (grounding && grounding.length) return grounding;
  const text = extractTextFromGemini(resp);
  return parseSerpJson(text || '');
};

const callOpenAIChat = (
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  label: string
): string => {
  const payload = { model, messages };
  const resp = httpPostJson(
    label || 'OpenAI Chat',
    'https://api.openai.com/v1/chat/completions',
    payload,
    {
      Authorization: 'Bearer ' + apiKey,
    }
  );
  const choice = resp.choices && resp.choices[0];
  return choice && choice.message && choice.message.content ? choice.message.content : '';
};

const callOpenAIResponse = (apiKey: string, body: Record<string, unknown>, label: string): any => {
  return httpPostJson(label || 'OpenAI Responses', 'https://api.openai.com/v1/responses', body, {
    Authorization: 'Bearer ' + apiKey,
  });
};

const callGemini = (apiKey: string, model: string, body: Record<string, unknown>, label: string): any => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return httpPostJson(label || `Gemini ${model}`, url, body, {});
};

const httpPostJson = (
  label: string,
  url: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>
): any => {
  writeLog('INFO', `${label} → ${url} | payload=${stringifySafe(payload, 1200)}`);
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers,
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  writeLog('INFO', `${label} ← HTTP ${code} | body=${body.slice(0, 1200)}${body.length > 1200 ? '... (truncated)' : ''}`);
  if (code >= 300) {
    throw new Error(`HTTP ${code}: ${body}`);
  }
  return JSON.parse(body);
};

const extractTextFromGemini = (resp: any): string => {
  const candidates = resp.candidates || [];
  const parts = candidates[0]?.content?.parts || [];
  return parts.map((p: { text?: string }) => p.text || '').join('');
};

const extractOpenAIResponseText = (resp: any): string => {
  if (!resp) return '';
  if (resp.output_text) return resp.output_text;
  if (Array.isArray(resp.output)) {
    for (const item of resp.output) {
      const contentArray = item?.content;
      if (Array.isArray(contentArray)) {
        const text = contentArray.map((c: any) => c?.text || '').join('');
        if (text.trim()) return text;
      }
      const messageContent = item?.message?.content;
      if (Array.isArray(messageContent)) {
        const text = messageContent.map((c: any) => c?.text || '').join('');
        if (text.trim()) return text;
      }
      if (typeof item?.text === 'string' && item.text.trim()) return item.text;
    }
  }
  return '';
};

const findRank = (results: SerpResult[] | null, target: string) => {
  if (!results || !results.length) return { rank: '-', url: '-' };
  const found = results.find(r => r.domain.includes(target) || r.url.includes(target));
  if (found) return { rank: found.rank, url: found.url };
  return { rank: '-', url: '-' };
};

const serializeResults = (results: SerpResult[] | null): string => {
  if (!results || !results.length) return '';
  return results.map(r => `${r.rank}: ${r.url}`).join('\n');
};

const stringifySafe = (value: unknown, maxLen = 1500): string => {
  try {
    const json = JSON.stringify(value);
    return json.length > maxLen ? `${json.slice(0, maxLen)}... (truncated)` : json;
  } catch (e) {
    return String(value);
  }
};
