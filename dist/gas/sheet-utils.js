"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cityFromLocation = exports.validateConfig = exports.getCountryOptions = exports.getLanguageOptions = exports.ensureConfigReady = exports.seedResultsFromQueries = exports.findQueryColumn = exports.findDataSheet = exports.setRowStatus = exports.writeRow = exports.buildEmptyRow = exports.normalizeOutputRow = exports.writeLog = exports.readPrompts = exports.readSettings = exports.resetPromptsSheet = exports.resetSettingsSheet = exports.ensureSheets = exports.OUTPUT_HEADERS = exports.SHEETS = void 0;
const config_1 = require("./generated/config");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
exports.SHEETS = {
    QUERIES: 'Queries',
    RESULTS: 'Results',
    SETTINGS: 'Settings',
    LOGS: 'Logs',
    PROMPTS: 'Prompts',
};
exports.OUTPUT_HEADERS = [
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
];
const APP_GSC_HEADERS = ['Top queries', 'Query', 'Suchanfrage', 'Keyword', 'Search term'];
const APP_METRIC_HEADERS = ['clicks', 'impressions', 'ctr', 'position'];
const ensureSheets = () => {
    const ss = SpreadsheetApp.getActive();
    Object.values(exports.SHEETS).forEach(name => {
        if (!ss.getSheetByName(name)) {
            ss.insertSheet(name);
        }
    });
    const results = ss.getSheetByName(exports.SHEETS.RESULTS);
    results
        .getRange(1, 1, 1, exports.OUTPUT_HEADERS.length)
        .setValues([exports.OUTPUT_HEADERS]);
    const settings = ss.getSheetByName(exports.SHEETS.SETTINGS);
    if (settings.getLastRow() === 0) {
        settings.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Notes']]);
        const rows = [
            ['TARGET_DOMAIN', config_1.DEFAULT_SETTINGS.target_domain, 'Domain to track'],
            ['USER_LOCATION', config_1.DEFAULT_SETTINGS.user_location, 'City, Country'],
            ['LANGUAGE', config_1.DEFAULT_SETTINGS.language || 'en', 'ISO 639-1'],
            ['COUNTRY_CODE', constants_1.LOCATION_CONFIG.DEFAULT_COUNTRY_CODE, 'ISO-2 for web search'],
            ['MODEL_OPENAI', config_1.DEFAULT_SETTINGS.model_openai, 'OpenAI model'],
            ['MODEL_GEMINI', config_1.DEFAULT_SETTINGS.model_gemini, 'Gemini model'],
            ['BATCH_SIZE', 5, 'Rows per batch'],
            ['RATE_LIMIT_MS', 500, 'Delay between rows'],
        ];
        settings.getRange(2, 1, rows.length, 3).setValues(rows);
    }
    const logs = ss.getSheetByName(exports.SHEETS.LOGS);
    if (logs.getLastRow() === 0) {
        logs.getRange(1, 1, 1, 3).setValues([['Timestamp', 'Level', 'Message']]);
    }
    const prompts = ss.getSheetByName(exports.SHEETS.PROMPTS);
    if (prompts.getLastRow() === 0) {
        prompts.getRange(1, 1, 1, 3).setValues([['Key', 'Prompt', 'Notes']]);
        const rows = Object.entries(config_1.DEFAULT_PROMPTS).map(([k, v]) => [k, v, 'Edit to override default prompt']);
        prompts.getRange(2, 1, rows.length, 3).setValues(rows);
    }
};
exports.ensureSheets = ensureSheets;
const resetSettingsSheet = () => {
    const ss = SpreadsheetApp.getActive();
    const settings = ss.getSheetByName(exports.SHEETS.SETTINGS);
    settings.clear();
    settings.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'Notes']]);
    const rows = [
        ['TARGET_DOMAIN', config_1.DEFAULT_SETTINGS.target_domain, 'Domain to track'],
        ['USER_LOCATION', config_1.DEFAULT_SETTINGS.user_location, 'City, Country'],
        ['LANGUAGE', config_1.DEFAULT_SETTINGS.language || 'en', 'ISO 639-1'],
        ['COUNTRY_CODE', constants_1.LOCATION_CONFIG.DEFAULT_COUNTRY_CODE, 'ISO-2 for web search'],
        ['MODEL_OPENAI', config_1.DEFAULT_SETTINGS.model_openai, 'OpenAI model'],
        ['MODEL_GEMINI', config_1.DEFAULT_SETTINGS.model_gemini, 'Gemini model'],
        ['BATCH_SIZE', 5, 'Rows per batch'],
        ['RATE_LIMIT_MS', 500, 'Delay between rows'],
    ];
    settings.getRange(2, 1, rows.length, 3).setValues(rows);
};
exports.resetSettingsSheet = resetSettingsSheet;
const resetPromptsSheet = () => {
    const ss = SpreadsheetApp.getActive();
    const prompts = ss.getSheetByName(exports.SHEETS.PROMPTS);
    prompts.clear();
    prompts.getRange(1, 1, 1, 3).setValues([['Key', 'Prompt', 'Notes']]);
    const rows = Object.entries(config_1.DEFAULT_PROMPTS).map(([k, v]) => [k, v, 'Edit to override default prompt']);
    prompts.getRange(2, 1, rows.length, 3).setValues(rows);
};
exports.resetPromptsSheet = resetPromptsSheet;
const readSettings = () => {
    const ss = SpreadsheetApp.getActive();
    const settings = ss.getSheetByName(exports.SHEETS.SETTINGS);
    const map = new Map();
    const rows = settings
        .getRange(2, 1, settings.getLastRow() - 1, 2)
        .getValues();
    rows.forEach(([k, v]) => {
        map.set(String(k), typeof v === 'string' ? v.trim() : v);
    });
    const props = PropertiesService.getScriptProperties();
    return {
        openaiKey: props.getProperty('OPENAI_API_KEY') || '',
        geminiKey: props.getProperty('GEMINI_API_KEY') || '',
        targetDomain: String(map.get('TARGET_DOMAIN') || config_1.DEFAULT_SETTINGS.target_domain || '').toLowerCase(),
        userLocation: String(map.get('USER_LOCATION') || config_1.DEFAULT_SETTINGS.user_location || ''),
        language: String(map.get('LANGUAGE') || config_1.DEFAULT_SETTINGS.language || 'en'),
        countryCode: String(map.get('COUNTRY_CODE') || constants_1.LOCATION_CONFIG.DEFAULT_COUNTRY_CODE || 'AT'),
        modelOpenai: String(map.get('MODEL_OPENAI') || config_1.DEFAULT_SETTINGS.model_openai || 'gpt-5-mini'),
        modelGemini: String(map.get('MODEL_GEMINI') || config_1.DEFAULT_SETTINGS.model_gemini || 'gemini-2.5-flash'),
        batchSize: Number(map.get('BATCH_SIZE') || 5),
        rateLimitMs: Number(map.get('RATE_LIMIT_MS') || 500),
    };
};
exports.readSettings = readSettings;
const readPrompts = () => {
    const ss = SpreadsheetApp.getActive();
    const promptsSheet = ss.getSheetByName(exports.SHEETS.PROMPTS);
    if (!promptsSheet)
        return { ...config_1.DEFAULT_PROMPTS };
    const rows = promptsSheet
        .getRange(2, 1, Math.max(promptsSheet.getLastRow() - 1, 0), 2)
        .getValues();
    const map = { ...config_1.DEFAULT_PROMPTS };
    rows.forEach(([k, v]) => {
        if (!k)
            return;
        map[String(k).trim()] = typeof v === 'string' ? v : String(v || '');
    });
    return map;
};
exports.readPrompts = readPrompts;
const writeLog = (level, message) => {
    const sheet = SpreadsheetApp.getActive().getSheetByName(exports.SHEETS.LOGS);
    sheet.appendRow([new Date(), level, message]);
};
exports.writeLog = writeLog;
const normalizeOutputRow = (row) => {
    return Array.from({ length: exports.OUTPUT_HEADERS.length }, (_, idx) => {
        const value = row[idx];
        return value === undefined || value === null ? '' : value;
    });
};
exports.normalizeOutputRow = normalizeOutputRow;
const buildEmptyRow = (query) => {
    return (0, exports.normalizeOutputRow)([
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
exports.buildEmptyRow = buildEmptyRow;
const writeRow = (sheet, rowIndex, row) => {
    sheet.getRange(rowIndex, 1, 1, exports.OUTPUT_HEADERS.length).setValues([(0, exports.normalizeOutputRow)(row)]);
};
exports.writeRow = writeRow;
const setRowStatus = (sheet, rowIndex, status) => {
    const colors = {
        processing: '#d9eaff',
        [constants_1.RESULT_STATUS.VISIBLE]: '#d4f4d2',
        [constants_1.RESULT_STATUS.TOOL_ONLY]: '#fff5cc',
        [constants_1.RESULT_STATUS.INVISIBLE]: '#f0f0f0',
        [constants_1.RESULT_STATUS.ERROR]: '#ffd6d6',
    };
    const color = colors[status] || '#ffffff';
    sheet.getRange(rowIndex, 1, 1, exports.OUTPUT_HEADERS.length).setBackground(color);
    sheet.getRange(rowIndex, 3).setValue(status);
};
exports.setRowStatus = setRowStatus;
const findDataSheet = () => {
    const ss = SpreadsheetApp.getActive();
    const sheets = ss.getSheets();
    const skipNames = new Set(Object.values(exports.SHEETS));
    for (const s of sheets) {
        if (skipNames.has(s.getName()))
            continue;
        if (s.getLastRow() < 2)
            continue;
        const data = s.getDataRange().getValues();
        if (!data.length)
            continue;
        const headers = data[0].map(h => String(h || '').toLowerCase());
        const queryCol = (0, exports.findQueryColumn)(data);
        const hasMetrics = APP_METRIC_HEADERS.some(m => headers.some(h => h.includes(m)));
        const hasKnownHeader = APP_GSC_HEADERS.some(g => headers.some(h => h.includes(g.toLowerCase()) || g.toLowerCase().includes(h)));
        if (queryCol !== -1 && (hasMetrics || hasKnownHeader)) {
            (0, exports.writeLog)('INFO', `Detected data sheet "${s.getName()}" with query column ${queryCol + 1}`);
            return { sheet: s, queryCol };
        }
    }
    const qSheet = ss.getSheetByName(exports.SHEETS.QUERIES);
    if (qSheet && qSheet.getLastRow() >= 2) {
        const data = qSheet.getDataRange().getValues();
        const queryCol = (0, exports.findQueryColumn)(data);
        if (queryCol !== -1) {
            (0, exports.writeLog)('INFO', `Fallback to sheet "${exports.SHEETS.QUERIES}" with query column ${queryCol + 1}`);
            return { sheet: qSheet, queryCol };
        }
    }
    throw new Error('Could not detect a data sheet with queries. Please ensure your sheet has a header row and a query-like column.');
};
exports.findDataSheet = findDataSheet;
const findQueryColumn = (data) => {
    if (!data.length)
        return -1;
    const headers = data[0].map(h => String(h || '').toLowerCase());
    for (let i = 0; i < headers.length; i++) {
        if (APP_GSC_HEADERS.some(g => headers[i].includes(g.toLowerCase()) || g.toLowerCase().includes(headers[i]))) {
            return i;
        }
    }
    const rows = data.slice(1);
    const samples = Math.min(constants_1.PROCESSING_CONSTANTS.QUERY_DETECTION_SAMPLE_SIZE, rows.length);
    let bestIdx = -1;
    let bestScore = 0;
    for (let col = 0; col < headers.length; col++) {
        let queryCount = 0;
        for (let r = 0; r < samples; r++) {
            const cell = String(rows[r][col] ?? '');
            if ((0, utils_1.isQueryLike)(cell))
                queryCount++;
        }
        const score = samples === 0 ? 0 : queryCount / samples;
        if (score >= constants_1.PROCESSING_CONSTANTS.QUERY_DETECTION_THRESHOLD && score > bestScore) {
            bestScore = score;
            bestIdx = col;
        }
    }
    return bestIdx;
};
exports.findQueryColumn = findQueryColumn;
const seedResultsFromQueries = () => {
    const { sheet: dataSheet, queryCol } = (0, exports.findDataSheet)();
    const rSheet = SpreadsheetApp.getActive().getSheetByName(exports.SHEETS.RESULTS);
    const existing = rSheet.getLastRow();
    let shouldSeed = existing <= 1;
    if (!shouldSeed && existing > 1) {
        const existingQueries = rSheet.getRange(2, 1, existing - 1, 1).getValues();
        const hasQueries = existingQueries.some(([q]) => String(q || '').trim());
        if (!hasQueries) {
            shouldSeed = true;
            (0, exports.writeLog)('INFO', 'Results sheet empty; reseeding queries from detected data sheet.');
            rSheet.getRange(2, 1, existing - 1, exports.OUTPUT_HEADERS.length).clearContent();
            rSheet.getRange(2, 3, existing - 1, 1).setBackground(null);
        }
    }
    if (!shouldSeed)
        return;
    const data = dataSheet.getDataRange().getValues();
    data.shift();
    const rows = data
        .map((row) => String(row[queryCol] ?? '').trim())
        .filter((q) => Boolean(q))
        .map((q) => (0, exports.buildEmptyRow)(q));
    if (!rows.length) {
        throw new Error('No queries found in detected data sheet.');
    }
    rSheet.getRange(2, 1, rows.length, exports.OUTPUT_HEADERS.length).setValues(rows);
    (0, exports.writeLog)('INFO', `Seeded ${rows.length} queries from sheet "${dataSheet.getName()}" (col ${queryCol + 1})`);
};
exports.seedResultsFromQueries = seedResultsFromQueries;
const ensureConfigReady = (cfg) => {
    const missing = [];
    if (!cfg.openaiKey)
        missing.push('OpenAI API key');
    if (!cfg.geminiKey)
        missing.push('Gemini API key');
    if (!cfg.targetDomain)
        missing.push('TARGET_DOMAIN');
    if (!cfg.userLocation)
        missing.push('USER_LOCATION');
    if (!missing.length)
        return true;
    const message = `Setup required (${missing.join(', ')}). Opening sidebar.`;
    (0, exports.writeLog)('WARN', message);
    SpreadsheetApp.getActive().toast(message, 'AI Visibility', 8);
    return false;
};
exports.ensureConfigReady = ensureConfigReady;
const getLanguageOptions = (current) => {
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
        .map(opt => `<option value="${opt}" ${opt.toLowerCase() === current.toLowerCase() ? 'selected' : ''}>${opt}</option>`)
        .join('');
};
exports.getLanguageOptions = getLanguageOptions;
const getCountryOptions = (current) => {
    const countries = [
        'AT', 'DE', 'CH', 'GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'FR', 'BE', 'NL', 'LU', 'ES', 'PT', 'IT', 'PL', 'CZ', 'SK', 'SE', 'NO', 'DK', 'FI',
    ];
    return countries
        .map(c => `<option value="${c}" ${c.toLowerCase() === current.toLowerCase() ? 'selected' : ''}>${c}</option>`)
        .join('');
};
exports.getCountryOptions = getCountryOptions;
const validateConfig = (cfg) => {
    if (!cfg.openaiKey)
        throw new Error('OpenAI API key missing. Open Setup.');
    if (!cfg.geminiKey)
        throw new Error('Gemini API key missing. Open Setup.');
    if (!cfg.targetDomain)
        throw new Error('TARGET_DOMAIN missing. Open Setup.');
    if (!cfg.userLocation)
        throw new Error('USER_LOCATION missing. Open Setup.');
};
exports.validateConfig = validateConfig;
const cityFromLocation = (loc) => {
    if (!loc)
        return '';
    const parts = loc.split(',');
    return (parts[0] || '').trim();
};
exports.cityFromLocation = cityFromLocation;
