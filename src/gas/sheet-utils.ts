import { DEFAULT_SETTINGS } from './generated/config';
import { RESULT_STATUS, PROCESSING_CONSTANTS, LOCATION_CONFIG } from '../constants';
import { isQueryLike } from '../utils';
import { GasConfig } from './models';

export const SHEETS = {
  QUERIES: 'Queries',
  RESULTS: 'Results',
  SETTINGS: 'Settings',
  LOGS: 'Logs',
} as const;

export const OUTPUT_HEADERS = [
  'Original Query',
  'Persona Prompt',
  'Visibility Status',
  'Check Status',
  'GPT Rank',
  'GPT URL',
  'GPT Rank (Web)',
  'GPT URL (Web)',
  'Gemini Rank',
  'Gemini URL',
  'Gemini Rank (Web)',
  'Gemini URL (Web)',
  'GPT NoTools (all URLs)',
  'GPT Web (all URLs)',
  'Gemini No (all URLs)',
  'Gemini Web (all URLs)',
  'Error',
] as const;

const APP_GSC_HEADERS = ['Top queries', 'Query', 'Suchanfrage', 'Keyword', 'Search term'];
const APP_METRIC_HEADERS = ['clicks', 'impressions', 'ctr', 'position'];

export const ensureSheets = (): void => {
  const ss = SpreadsheetApp.getActive();
  Object.values(SHEETS).forEach(name => {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  });

  const results = ss.getSheetByName(SHEETS.RESULTS);
  results
    .getRange(1, 1, 1, OUTPUT_HEADERS.length)
    .setValues([OUTPUT_HEADERS as unknown as string[]]);

  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  if (settings.getLastRow() === 0) {
    settings.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Notes']]);
    const rows = [
      ['TARGET_DOMAIN', DEFAULT_SETTINGS.target_domain, 'Domain to track'],
      ['USER_LOCATION', DEFAULT_SETTINGS.user_location, 'City, Country'],
      ['LANGUAGE', DEFAULT_SETTINGS.language || 'en', 'ISO 639-1'],
      ['COUNTRY_CODE', LOCATION_CONFIG.DEFAULT_COUNTRY_CODE, 'ISO-2 for web search'],
      ['MODEL_OPENAI', DEFAULT_SETTINGS.model_openai, 'OpenAI model'],
      ['MODEL_GEMINI', DEFAULT_SETTINGS.model_gemini, 'Gemini model'],
      ['BATCH_SIZE', 5, 'Rows per batch'],
      ['RATE_LIMIT_MS', 500, 'Delay between rows'],
    ];
    settings.getRange(2, 1, rows.length, 3).setValues(rows);
  }

  const logs = ss.getSheetByName(SHEETS.LOGS);
  if (logs.getLastRow() === 0) {
    logs.getRange(1, 1, 1, 3).setValues([['Timestamp', 'Level', 'Message']]);
  }
};

export const resetSettingsSheet = (): void => {
  const ss = SpreadsheetApp.getActive();
  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  settings.clear();
  settings.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Notes']]);
  const rows = [
    ['TARGET_DOMAIN', DEFAULT_SETTINGS.target_domain, 'Domain to track'],
    ['USER_LOCATION', DEFAULT_SETTINGS.user_location, 'City, Country'],
    ['LANGUAGE', DEFAULT_SETTINGS.language || 'en', 'ISO 639-1'],
    ['COUNTRY_CODE', LOCATION_CONFIG.DEFAULT_COUNTRY_CODE, 'ISO-2 for web search'],
    ['MODEL_OPENAI', DEFAULT_SETTINGS.model_openai, 'OpenAI model'],
    ['MODEL_GEMINI', DEFAULT_SETTINGS.model_gemini, 'Gemini model'],
    ['BATCH_SIZE', 5, 'Rows per batch'],
    ['RATE_LIMIT_MS', 500, 'Delay between rows'],
  ];
  settings.getRange(2, 1, rows.length, 3).setValues(rows);
};

export const readSettings = (): GasConfig => {
  const ss = SpreadsheetApp.getActive();
  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  const map = new Map<string, string | number>();
  const rows = settings
    .getRange(2, 1, settings.getLastRow() - 1, 2)
    .getValues() as Array<[string, string]>;
  rows.forEach(([k, v]: [string, string]) => {
    map.set(String(k), typeof v === 'string' ? v.trim() : v);
  });

  const props = PropertiesService.getScriptProperties();

  return {
    openaiKey: props.getProperty('OPENAI_API_KEY') || '',
    geminiKey: props.getProperty('GEMINI_API_KEY') || '',
    targetDomain: String(map.get('TARGET_DOMAIN') || DEFAULT_SETTINGS.target_domain || '').toLowerCase(),
    userLocation: String(map.get('USER_LOCATION') || DEFAULT_SETTINGS.user_location || ''),
    language: String(map.get('LANGUAGE') || DEFAULT_SETTINGS.language || 'en'),
    countryCode: String(map.get('COUNTRY_CODE') || LOCATION_CONFIG.DEFAULT_COUNTRY_CODE || 'AT'),
    modelOpenai: String(map.get('MODEL_OPENAI') || DEFAULT_SETTINGS.model_openai || 'gpt-5-mini'),
    modelGemini: String(map.get('MODEL_GEMINI') || DEFAULT_SETTINGS.model_gemini || 'gemini-2.5-flash'),
    batchSize: Number(map.get('BATCH_SIZE') || 5),
    rateLimitMs: Number(map.get('RATE_LIMIT_MS') || 500),
  };
};

export const writeLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string): void => {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.LOGS);
  sheet.appendRow([new Date(), level, message]);
};

export const normalizeOutputRow = (row: Array<string | number>): Array<string | number> => {
  return Array.from({ length: OUTPUT_HEADERS.length }, (_, idx) => {
    const value = row[idx];
    return value === undefined || value === null ? '' : value;
  });
};

export const buildEmptyRow = (query: string): Array<string | number> => {
  return normalizeOutputRow([
    query,
    '',
    '',
    'pending',
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
    '',
  ]);
};

export const writeRow = (sheet: any, rowIndex: number, row: Array<string | number>): void => {
  sheet.getRange(rowIndex, 1, 1, OUTPUT_HEADERS.length).setValues([normalizeOutputRow(row)]);
};

export const setRowStatus = (sheet: any, rowIndex: number, status: string) => {
  const colors: Record<string, string> = {
    processing: '#d9eaff',
    [RESULT_STATUS.VISIBLE]: '#d4f4d2',
    [RESULT_STATUS.TOOL_ONLY]: '#fff5cc',
    [RESULT_STATUS.INVISIBLE]: '#f0f0f0',
    [RESULT_STATUS.ERROR]: '#ffd6d6',
  };
  const color = colors[status] || '#ffffff';
  sheet.getRange(rowIndex, 1, 1, OUTPUT_HEADERS.length).setBackground(color);
  sheet.getRange(rowIndex, 3).setValue(status);
};

export const findDataSheet = (): { sheet: any; queryCol: number } => {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();
  const skipNames = new Set(Object.values(SHEETS));

  for (const s of sheets) {
    if (skipNames.has(s.getName())) continue;
    if (s.getLastRow() < 2) continue;

    const data = s.getDataRange().getValues() as unknown[][];
    if (!data.length) continue;
    const headers = data[0].map(h => String(h || '').toLowerCase());
    const queryCol = findQueryColumn(data);
    const hasMetrics = APP_METRIC_HEADERS.some(m => headers.some(h => h.includes(m)));
    const hasKnownHeader = APP_GSC_HEADERS.some(g =>
      headers.some(h => h.includes(g.toLowerCase()) || g.toLowerCase().includes(h))
    );

    if (queryCol !== -1 && (hasMetrics || hasKnownHeader)) {
      writeLog('INFO', `Detected data sheet "${s.getName()}" with query column ${queryCol + 1}`);
      return { sheet: s, queryCol };
    }
  }

  const qSheet = ss.getSheetByName(SHEETS.QUERIES);
  if (qSheet && qSheet.getLastRow() >= 2) {
    const data = qSheet.getDataRange().getValues() as unknown[][];
    const queryCol = findQueryColumn(data);
    if (queryCol !== -1) {
      writeLog('INFO', `Fallback to sheet "${SHEETS.QUERIES}" with query column ${queryCol + 1}`);
      return { sheet: qSheet, queryCol };
    }
  }

  throw new Error('Could not detect a data sheet with queries. Please ensure your sheet has a header row and a query-like column.');
};

export const findQueryColumn = (data: unknown[][]): number => {
  if (!data.length) return -1;

  const headers = data[0].map(h => String(h || '').toLowerCase());

  for (let i = 0; i < headers.length; i++) {
    if (
      APP_GSC_HEADERS.some(
        g =>
          headers[i].includes(g.toLowerCase()) || g.toLowerCase().includes(headers[i])
      )
    ) {
      return i;
    }
  }

  const rows = data.slice(1);
  const samples = Math.min(PROCESSING_CONSTANTS.QUERY_DETECTION_SAMPLE_SIZE, rows.length);
  let bestIdx = -1;
  let bestScore = 0;

  for (let col = 0; col < headers.length; col++) {
    let queryCount = 0;
    for (let r = 0; r < samples; r++) {
      const cell = String(rows[r][col] ?? '');
      if (isQueryLike(cell)) queryCount++;
    }
    const score = samples === 0 ? 0 : queryCount / samples;
    if (score >= PROCESSING_CONSTANTS.QUERY_DETECTION_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestIdx = col;
    }
  }

  return bestIdx;
};

export const seedResultsFromQueries = (): void => {
  const { sheet: dataSheet, queryCol } = findDataSheet();
  const rSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.RESULTS);

  const existing = rSheet.getLastRow();
  let shouldSeed = existing <= 1;

  if (!shouldSeed && existing > 1) {
    const existingQueries = rSheet.getRange(2, 1, existing - 1, 1).getValues() as unknown[][];
    const hasQueries = existingQueries.some(([q]) => String(q || '').trim());
    if (!hasQueries) {
      shouldSeed = true;
      writeLog('INFO', 'Results sheet empty; reseeding queries from detected data sheet.');
      rSheet.getRange(2, 1, existing - 1, OUTPUT_HEADERS.length).clearContent();
      rSheet.getRange(2, 3, existing - 1, 1).setBackground(null);
    }
  }

  if (!shouldSeed) return;

  const data = dataSheet.getDataRange().getValues() as unknown[][];
  data.shift();

  const rows = data
    .map((row: unknown[]) => String(row[queryCol] ?? '').trim())
    .filter((q: string) => Boolean(q))
    .map((q: string) => buildEmptyRow(q));

  if (!rows.length) {
    throw new Error('No queries found in detected data sheet.');
  }

  rSheet.getRange(2, 1, rows.length, OUTPUT_HEADERS.length).setValues(rows);
  writeLog('INFO', `Seeded ${rows.length} queries from sheet "${dataSheet.getName()}" (col ${queryCol + 1})`);
};

export const ensureConfigReady = (cfg: GasConfig): boolean => {
  const missing: string[] = [];
  if (!cfg.openaiKey) missing.push('OpenAI API key');
  if (!cfg.geminiKey) missing.push('Gemini API key');
  if (!cfg.targetDomain) missing.push('TARGET_DOMAIN');
  if (!cfg.userLocation) missing.push('USER_LOCATION');

  if (!missing.length) return true;

  const message = `Setup required (${missing.join(', ')}). Opening sidebar.`;
  writeLog('WARN', message);
  SpreadsheetApp.getActive().toast(message, 'AI Visibility', 8);
  return false;
};

export const getLanguageOptions = (current: string): string => {
  const options = [
    'de-AT',
    'de-DE',
    'de-CH',
    'en-US',
    'en-GB',
    'en-IE',
    'en-AU',
    'en-NZ',
    'en-CA',
    'fr-FR',
    'fr-CA',
    'es-ES',
    'es-MX',
    'it-IT',
    'nl-NL',
    'pt-PT',
    'pt-BR',
    'pl-PL',
    'cs-CZ',
    'sk-SK',
    'sv-SE',
    'no-NO',
    'da-DK',
    'fi-FI',
  ];
  return options
    .map(
      opt =>
        `<option value="${opt}" ${opt.toLowerCase() === current.toLowerCase() ? 'selected' : ''}>${opt}</option>`
    )
    .join('');
};

export const getCountryOptions = (current: string): string => {
  const countries = [
    'AT', 'DE', 'CH', 'GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'FR', 'BE', 'NL', 'LU', 'ES', 'PT', 'IT', 'PL', 'CZ', 'SK', 'SE', 'NO', 'DK', 'FI',
  ];
  return countries
    .map(c => `<option value="${c}" ${c.toLowerCase() === current.toLowerCase() ? 'selected' : ''}>${c}</option>`)
    .join('');
};

export const validateConfig = (cfg: GasConfig): void => {
  if (!cfg.openaiKey) throw new Error('OpenAI API key missing. Open Setup.');
  if (!cfg.geminiKey) throw new Error('Gemini API key missing. Open Setup.');
  if (!cfg.targetDomain) throw new Error('TARGET_DOMAIN missing. Open Setup.');
  if (!cfg.userLocation) throw new Error('USER_LOCATION missing. Open Setup.');
};

export const cityFromLocation = (loc: string): string => {
  if (!loc) return '';
  const parts = loc.split(',');
  return (parts[0] || '').trim();
};
