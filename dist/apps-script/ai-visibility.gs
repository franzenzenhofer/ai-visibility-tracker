// Generated for Google Apps Script. Source: src/gas | config: geo-visibility-config.toml
// Build time: Sat Nov 22 2025 16:48:16 GMT+0100 (Central European Standard Time)
// Paste this file into Apps Script editor (File > New > Script file).

"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/constants.ts
  var PROCESSING_CONSTANTS, RESULT_STATUS, LOCATION_CONFIG, PROMPT_PLACEHOLDERS, DOMAIN_PREFIXES_TO_REMOVE, URL_PROTOCOLS;
  var init_constants = __esm({
    "src/constants.ts"() {
      "use strict";
      PROCESSING_CONSTANTS = {
        /** Rate limiting delay between API calls (milliseconds) */
        RATE_LIMIT_DELAY_MS: 500,
        /** Maximum concurrent API calls in queue */
        QUEUE_CONCURRENCY: 3,
        /** Number of samples to check for query column detection */
        QUERY_DETECTION_SAMPLE_SIZE: 10,
        /** Threshold for query column detection (70%) */
        QUERY_DETECTION_THRESHOLD: 0.7,
        /** Minimum query length in characters */
        QUERY_MIN_LENGTH: 2,
        /** Maximum query length in characters */
        QUERY_MAX_LENGTH: 200,
        /** Maximum number of SERP results to extract */
        MAX_SERP_RESULTS: 5
      };
      RESULT_STATUS = {
        VISIBLE: "visible",
        INVISIBLE: "invisible",
        TOOL_ONLY: "tool-only",
        ERROR: "error"
      };
      LOCATION_CONFIG = {
        /** Default country code for OpenAI location */
        DEFAULT_COUNTRY_CODE: "AT"
      };
      PROMPT_PLACEHOLDERS = {
        LOCATION: "{location}",
        QUERY: "{query}"
      };
      DOMAIN_PREFIXES_TO_REMOVE = ["www."];
      URL_PROTOCOLS = ["http", "www."];
    }
  });

  // src/gas/generated/config.ts
  var DEFAULT_SETTINGS, DEFAULT_PROMPTS;
  var init_config = __esm({
    "src/gas/generated/config.ts"() {
      "use strict";
      DEFAULT_SETTINGS = {
        target_domain: "",
        user_location: "",
        language: "en",
        model_openai: "gpt-5-mini",
        model_gemini: "gemini-2.5-flash"
      };
      DEFAULT_PROMPTS = {
        "persona_system": `You are helping convert search keywords into natural questions that include geographic context.

Context: The user is from {location}.

Task: Rewrite the given keyword into a natural, conversational question that starts with location context.

Format: "Hey, I am from {location} and I want to know: [natural question based on keyword]"

Rules:
- Keep the question natural and conversational
- Include the location context at the beginning
- Make it sound like something a real person would ask
- Output ONLY the question string, nothing else

Examples:
Input: "pizza delivery"
Output: "Hey, I am from {location} and I want to know: Where can I get pizza delivered tonight?"

Input: "best restaurants"
Output: "Hey, I am from {location} and I want to know: What are the best restaurants near me?"

Input: "weather forecast"
Output: "Hey, I am from {location} and I want to know: What's the weather forecast for today?"
`,
        "search_openai_no_tools_system": 'Role: Search Engine.\nTask: Provide top 5 search results based solely on your training data.\nOutput: Strict JSON Array in this exact format: [{"rank":1,"domain":"example.com","url":"https://example.com/page"}]\n\nRequirements:\n- Exactly 5 results\n- Results must be from your training knowledge only\n- Include full URLs\n- Return ONLY the JSON array, no other text',
        "search_openai_no_tools_user": "Query: {query}",
        "search_openai_with_tools_system": 'Role: Search Engine with real-time web capabilities.\nTask: Provide top 5 current, up-to-date search results using your web search capabilities.\nOutput: Strict JSON Array in this exact format: [{"rank":1,"domain":"example.com","url":"https://example.com/page"}]\n\nRequirements:\n- Use your web search tool to find CURRENT results\n- Exactly 5 results\n- Include full, specific URLs (not generic homepages)\n- Return ONLY the JSON array, no other text',
        "search_openai_with_tools_user": "Search query: {query}",
        "search_gemini_no_grounding": 'Query: "{query}".\n\nProvide top 5 search results based solely on your training knowledge.\nReturn results as strict JSON in this exact format: [{"rank":1,"domain":"example.com","url":"https://example.com/page"}]\n\nRequirements:\n- Exactly 5 results\n- Results must be from your training knowledge only\n- Include full URLs\n- Return ONLY the JSON array, no other text',
        "search_gemini_with_grounding": 'Query: "{query}".\n\nUse Google Search to provide top 5 current search results.\nReturn results as strict JSON in this exact format: [{"rank":1,"domain":"example.com","url":"https://example.com/page"}]\n\nRequirements:\n- Use Google Search grounding to find CURRENT results\n- Exactly 5 results\n- Include full, specific URLs (not generic homepages)\n- Return ONLY the JSON array, no other text'
      };
    }
  });

  // src/utils.ts
  var replacePromptPlaceholders, normalizeDomain, extractDomainFromUrl, isUrl, parseSerpJson, extractGeminiGroundingUrls, isQueryLike;
  var init_utils = __esm({
    "src/utils.ts"() {
      "use strict";
      init_constants();
      replacePromptPlaceholders = (prompt, userLocation, query) => {
        return prompt.replace(new RegExp(PROMPT_PLACEHOLDERS.LOCATION, "g"), userLocation).replace(new RegExp(PROMPT_PLACEHOLDERS.QUERY, "g"), query || "");
      };
      normalizeDomain = (domain) => {
        let normalized = domain.toLowerCase();
        for (const prefix of DOMAIN_PREFIXES_TO_REMOVE) {
          if (normalized.startsWith(prefix)) {
            normalized = normalized.substring(prefix.length);
          }
        }
        return normalized;
      };
      extractDomainFromUrl = (url) => {
        try {
          const urlObj = new URL(url);
          return normalizeDomain(urlObj.hostname);
        } catch {
          return "";
        }
      };
      isUrl = (value) => {
        return URL_PROTOCOLS.some((protocol) => value.startsWith(protocol));
      };
      parseSerpJson = (text) => {
        try {
          const match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
          if (!match) {
            return null;
          }
          const arr = JSON.parse(match[0]);
          if (!Array.isArray(arr)) {
            return null;
          }
          return arr.map((item) => {
            const url = item.url || item.link || item.href || "";
            let domain = item.domain || "";
            if (!domain && url) {
              domain = extractDomainFromUrl(url);
            }
            domain = normalizeDomain(domain);
            return {
              rank: item.rank || 0,
              domain,
              url
            };
          });
        } catch (error) {
          console.error("Failed to parse SERP JSON:", error);
          return null;
        }
      };
      extractGeminiGroundingUrls = (response) => {
        try {
          const metadata = response.groundingMetadata || response.grounding_metadata;
          if (!metadata) {
            return null;
          }
          const chunks = metadata.groundingChunks || metadata.grounding_chunks || metadata.webSearchQueries || [];
          if (!Array.isArray(chunks) || chunks.length === 0) {
            return null;
          }
          const results = [];
          const maxResults = Math.min(
            PROCESSING_CONSTANTS.MAX_SERP_RESULTS,
            chunks.length
          );
          for (let i = 0; i < maxResults; i++) {
            const chunk = chunks[i];
            const uri = chunk.uri || chunk.url || chunk.web?.uri || chunk.web?.url;
            if (uri && !uri.includes("grounding-api-redirect")) {
              const domain = extractDomainFromUrl(uri);
              if (domain) {
                results.push({
                  rank: i + 1,
                  domain,
                  url: uri
                });
              }
            }
          }
          return results.length > 0 ? results : null;
        } catch {
          return null;
        }
      };
      isQueryLike = (value) => {
        const trimmed = value.trim();
        const hasValidLength = trimmed.length >= PROCESSING_CONSTANTS.QUERY_MIN_LENGTH && trimmed.length <= PROCESSING_CONSTANTS.QUERY_MAX_LENGTH;
        const hasLetters = /[a-zA-ZäöüßÄÖÜàáâãåèéêëìíîïòóôõùúûýÿčćđšžÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝŸČĆĐŠŽ]/.test(
          trimmed
        );
        const notUrl = !isUrl(trimmed);
        return hasValidLength && hasLetters && notUrl;
      };
    }
  });

  // src/gas/sheet-utils.ts
  var SHEETS, OUTPUT_HEADERS, APP_GSC_HEADERS, APP_METRIC_HEADERS, ensureSheets, resetSettingsSheet, readSettings, writeLog, normalizeOutputRow, buildEmptyRow, writeRow, setRowStatus, findDataSheet, findQueryColumn, seedResultsFromQueries, ensureConfigReady, getLanguageOptions, getCountryOptions, validateConfig, cityFromLocation;
  var init_sheet_utils = __esm({
    "src/gas/sheet-utils.ts"() {
      "use strict";
      init_config();
      init_constants();
      init_utils();
      SHEETS = {
        QUERIES: "Queries",
        RESULTS: "Results",
        SETTINGS: "Settings",
        LOGS: "Logs"
      };
      OUTPUT_HEADERS = [
        "Original Query",
        "Persona Prompt",
        "Visibility Status",
        "Check Status",
        "GPT Rank",
        "GPT URL",
        "GPT Rank (Web)",
        "GPT URL (Web)",
        "Gemini Rank",
        "Gemini URL",
        "Gemini Rank (Web)",
        "Gemini URL (Web)",
        "GPT NoTools (all URLs)",
        "GPT Web (all URLs)",
        "Gemini No (all URLs)",
        "Gemini Web (all URLs)",
        "Error"
      ];
      APP_GSC_HEADERS = ["Top queries", "Query", "Suchanfrage", "Keyword", "Search term"];
      APP_METRIC_HEADERS = ["clicks", "impressions", "ctr", "position"];
      ensureSheets = () => {
        const ss = SpreadsheetApp.getActive();
        Object.values(SHEETS).forEach((name) => {
          if (!ss.getSheetByName(name)) {
            ss.insertSheet(name);
          }
        });
        const results = ss.getSheetByName(SHEETS.RESULTS);
        results.getRange(1, 1, 1, OUTPUT_HEADERS.length).setValues([OUTPUT_HEADERS]);
        const settings = ss.getSheetByName(SHEETS.SETTINGS);
        if (settings.getLastRow() === 0) {
          settings.getRange(1, 1, 1, 3).setValues([["Key", "Value", "Notes"]]);
          const rows = [
            ["TARGET_DOMAIN", DEFAULT_SETTINGS.target_domain, "Domain to track"],
            ["USER_LOCATION", DEFAULT_SETTINGS.user_location, "City, Country"],
            ["LANGUAGE", DEFAULT_SETTINGS.language || "en", "ISO 639-1"],
            ["COUNTRY_CODE", LOCATION_CONFIG.DEFAULT_COUNTRY_CODE, "ISO-2 for web search"],
            ["MODEL_OPENAI", DEFAULT_SETTINGS.model_openai, "OpenAI model"],
            ["MODEL_GEMINI", DEFAULT_SETTINGS.model_gemini, "Gemini model"],
            ["BATCH_SIZE", 5, "Rows per batch"],
            ["RATE_LIMIT_MS", 500, "Delay between rows"]
          ];
          settings.getRange(2, 1, rows.length, 3).setValues(rows);
        }
        const logs = ss.getSheetByName(SHEETS.LOGS);
        if (logs.getLastRow() === 0) {
          logs.getRange(1, 1, 1, 3).setValues([["Timestamp", "Level", "Message"]]);
        }
      };
      resetSettingsSheet = () => {
        const ss = SpreadsheetApp.getActive();
        const settings = ss.getSheetByName(SHEETS.SETTINGS);
        settings.clear();
        settings.getRange(1, 1, 1, 3).setValues([["Key", "Value", "Notes"]]);
        const rows = [
          ["TARGET_DOMAIN", DEFAULT_SETTINGS.target_domain, "Domain to track"],
          ["USER_LOCATION", DEFAULT_SETTINGS.user_location, "City, Country"],
          ["LANGUAGE", DEFAULT_SETTINGS.language || "en", "ISO 639-1"],
          ["COUNTRY_CODE", LOCATION_CONFIG.DEFAULT_COUNTRY_CODE, "ISO-2 for web search"],
          ["MODEL_OPENAI", DEFAULT_SETTINGS.model_openai, "OpenAI model"],
          ["MODEL_GEMINI", DEFAULT_SETTINGS.model_gemini, "Gemini model"],
          ["BATCH_SIZE", 5, "Rows per batch"],
          ["RATE_LIMIT_MS", 500, "Delay between rows"]
        ];
        settings.getRange(2, 1, rows.length, 3).setValues(rows);
      };
      readSettings = () => {
        const ss = SpreadsheetApp.getActive();
        const settings = ss.getSheetByName(SHEETS.SETTINGS);
        const map = /* @__PURE__ */ new Map();
        const rows = settings.getRange(2, 1, settings.getLastRow() - 1, 2).getValues();
        rows.forEach(([k, v]) => {
          map.set(String(k), typeof v === "string" ? v.trim() : v);
        });
        const props = PropertiesService.getScriptProperties();
        return {
          openaiKey: props.getProperty("OPENAI_API_KEY") || "",
          geminiKey: props.getProperty("GEMINI_API_KEY") || "",
          targetDomain: String(map.get("TARGET_DOMAIN") || DEFAULT_SETTINGS.target_domain || "").toLowerCase(),
          userLocation: String(map.get("USER_LOCATION") || DEFAULT_SETTINGS.user_location || ""),
          language: String(map.get("LANGUAGE") || DEFAULT_SETTINGS.language || "en"),
          countryCode: String(map.get("COUNTRY_CODE") || LOCATION_CONFIG.DEFAULT_COUNTRY_CODE || "AT"),
          modelOpenai: String(map.get("MODEL_OPENAI") || DEFAULT_SETTINGS.model_openai || "gpt-5-mini"),
          modelGemini: String(map.get("MODEL_GEMINI") || DEFAULT_SETTINGS.model_gemini || "gemini-2.5-flash"),
          batchSize: Number(map.get("BATCH_SIZE") || 5),
          rateLimitMs: Number(map.get("RATE_LIMIT_MS") || 500)
        };
      };
      writeLog = (level, message) => {
        const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.LOGS);
        sheet.appendRow([/* @__PURE__ */ new Date(), level, message]);
      };
      normalizeOutputRow = (row) => {
        return Array.from({ length: OUTPUT_HEADERS.length }, (_, idx) => {
          const value = row[idx];
          return value === void 0 || value === null ? "" : value;
        });
      };
      buildEmptyRow = (query) => {
        return normalizeOutputRow([
          query,
          "",
          "",
          "pending",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "",
          "",
          "",
          "",
          ""
        ]);
      };
      writeRow = (sheet, rowIndex, row) => {
        sheet.getRange(rowIndex, 1, 1, OUTPUT_HEADERS.length).setValues([normalizeOutputRow(row)]);
      };
      setRowStatus = (sheet, rowIndex, status) => {
        const colors = {
          processing: "#d9eaff",
          [RESULT_STATUS.VISIBLE]: "#d4f4d2",
          [RESULT_STATUS.TOOL_ONLY]: "#fff5cc",
          [RESULT_STATUS.INVISIBLE]: "#f0f0f0",
          [RESULT_STATUS.ERROR]: "#ffd6d6"
        };
        const color = colors[status] || "#ffffff";
        sheet.getRange(rowIndex, 1, 1, OUTPUT_HEADERS.length).setBackground(color);
        sheet.getRange(rowIndex, 3).setValue(status);
      };
      findDataSheet = () => {
        const ss = SpreadsheetApp.getActive();
        const sheets = ss.getSheets();
        const skipNames = new Set(Object.values(SHEETS));
        for (const s of sheets) {
          if (skipNames.has(s.getName())) continue;
          if (s.getLastRow() < 2) continue;
          const data = s.getDataRange().getValues();
          if (!data.length) continue;
          const headers = data[0].map((h) => String(h || "").toLowerCase());
          const queryCol = findQueryColumn(data);
          const hasMetrics = APP_METRIC_HEADERS.some((m) => headers.some((h) => h.includes(m)));
          const hasKnownHeader = APP_GSC_HEADERS.some(
            (g) => headers.some((h) => h.includes(g.toLowerCase()) || g.toLowerCase().includes(h))
          );
          if (queryCol !== -1 && (hasMetrics || hasKnownHeader)) {
            writeLog("INFO", `Detected data sheet "${s.getName()}" with query column ${queryCol + 1}`);
            return { sheet: s, queryCol };
          }
        }
        const qSheet = ss.getSheetByName(SHEETS.QUERIES);
        if (qSheet && qSheet.getLastRow() >= 2) {
          const data = qSheet.getDataRange().getValues();
          const queryCol = findQueryColumn(data);
          if (queryCol !== -1) {
            writeLog("INFO", `Fallback to sheet "${SHEETS.QUERIES}" with query column ${queryCol + 1}`);
            return { sheet: qSheet, queryCol };
          }
        }
        throw new Error("Could not detect a data sheet with queries. Please ensure your sheet has a header row and a query-like column.");
      };
      findQueryColumn = (data) => {
        if (!data.length) return -1;
        const headers = data[0].map((h) => String(h || "").toLowerCase());
        for (let i = 0; i < headers.length; i++) {
          if (APP_GSC_HEADERS.some(
            (g) => headers[i].includes(g.toLowerCase()) || g.toLowerCase().includes(headers[i])
          )) {
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
            const cell = String(rows[r][col] ?? "");
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
      seedResultsFromQueries = () => {
        const { sheet: dataSheet, queryCol } = findDataSheet();
        const rSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.RESULTS);
        const existing = rSheet.getLastRow();
        let shouldSeed = existing <= 1;
        if (!shouldSeed && existing > 1) {
          const existingQueries = rSheet.getRange(2, 1, existing - 1, 1).getValues();
          const hasQueries = existingQueries.some(([q]) => String(q || "").trim());
          if (!hasQueries) {
            shouldSeed = true;
            writeLog("INFO", "Results sheet empty; reseeding queries from detected data sheet.");
            rSheet.getRange(2, 1, existing - 1, OUTPUT_HEADERS.length).clearContent();
            rSheet.getRange(2, 3, existing - 1, 1).setBackground(null);
          }
        }
        if (!shouldSeed) return;
        const data = dataSheet.getDataRange().getValues();
        data.shift();
        const rows = data.map((row) => String(row[queryCol] ?? "").trim()).filter((q) => Boolean(q)).map((q) => buildEmptyRow(q));
        if (!rows.length) {
          throw new Error("No queries found in detected data sheet.");
        }
        rSheet.getRange(2, 1, rows.length, OUTPUT_HEADERS.length).setValues(rows);
        writeLog("INFO", `Seeded ${rows.length} queries from sheet "${dataSheet.getName()}" (col ${queryCol + 1})`);
      };
      ensureConfigReady = (cfg) => {
        const missing = [];
        if (!cfg.openaiKey) missing.push("OpenAI API key");
        if (!cfg.geminiKey) missing.push("Gemini API key");
        if (!cfg.targetDomain) missing.push("TARGET_DOMAIN");
        if (!cfg.userLocation) missing.push("USER_LOCATION");
        if (!missing.length) return true;
        const message = `Setup required (${missing.join(", ")}). Opening sidebar.`;
        writeLog("WARN", message);
        SpreadsheetApp.getActive().toast(message, "AI Visibility", 8);
        return false;
      };
      getLanguageOptions = (current) => {
        const options = [
          "de-AT",
          "de-DE",
          "de-CH",
          "en-US",
          "en-GB",
          "en-IE",
          "en-AU",
          "en-NZ",
          "en-CA",
          "fr-FR",
          "fr-CA",
          "es-ES",
          "es-MX",
          "it-IT",
          "nl-NL",
          "pt-PT",
          "pt-BR",
          "pl-PL",
          "cs-CZ",
          "sk-SK",
          "sv-SE",
          "no-NO",
          "da-DK",
          "fi-FI"
        ];
        return options.map(
          (opt) => `<option value="${opt}" ${opt.toLowerCase() === current.toLowerCase() ? "selected" : ""}>${opt}</option>`
        ).join("");
      };
      getCountryOptions = (current) => {
        const countries = [
          "AT",
          "DE",
          "CH",
          "GB",
          "IE",
          "US",
          "CA",
          "AU",
          "NZ",
          "FR",
          "BE",
          "NL",
          "LU",
          "ES",
          "PT",
          "IT",
          "PL",
          "CZ",
          "SK",
          "SE",
          "NO",
          "DK",
          "FI"
        ];
        return countries.map((c) => `<option value="${c}" ${c.toLowerCase() === current.toLowerCase() ? "selected" : ""}>${c}</option>`).join("");
      };
      validateConfig = (cfg) => {
        if (!cfg.openaiKey) throw new Error("OpenAI API key missing. Open Setup.");
        if (!cfg.geminiKey) throw new Error("Gemini API key missing. Open Setup.");
        if (!cfg.targetDomain) throw new Error("TARGET_DOMAIN missing. Open Setup.");
        if (!cfg.userLocation) throw new Error("USER_LOCATION missing. Open Setup.");
      };
      cityFromLocation = (loc) => {
        if (!loc) return "";
        const parts = loc.split(",");
        return (parts[0] || "").trim();
      };
    }
  });

  // src/gas/pipeline.ts
  var buildRowValues, processBatch, blankState, processRow, generatePersona, queryOpenAINoTools, queryOpenAIWithTools, queryGeminiNoGrounding, queryGeminiWithGrounding, callOpenAIChat, callOpenAIResponse, callGemini, httpPostJson, extractTextFromGemini, extractOpenAIResponseText, findRank, serializeResults, stringifySafe;
  var init_pipeline = __esm({
    "src/gas/pipeline.ts"() {
      "use strict";
      init_config();
      init_constants();
      init_utils();
      init_sheet_utils();
      buildRowValues = (query, state) => [
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
        state.error || ""
      ];
      processBatch = (cfg, shouldCancel) => {
        const ss = SpreadsheetApp.getActive();
        const rSheet = ss.getSheetByName(SHEETS.RESULTS);
        const data = rSheet.getRange(2, 1, rSheet.getLastRow() - 1, OUTPUT_HEADERS.length).getValues();
        const pending = data.map((row, idx) => ({ row, idx })).filter(({ row }) => !row[2] || row[2] === RESULT_STATUS.ERROR).slice(0, cfg.batchSize);
        let done = 0;
        let errors = 0;
        pending.forEach(({ row, idx }) => {
          if (shouldCancel()) throw new Error("Run cancelled");
          const query = row[0];
          try {
            setRowStatus(rSheet, idx + 2, "processing");
            const processed = processRow(
              String(query),
              cfg,
              idx + 2,
              (state) => writeRow(rSheet, idx + 2, buildRowValues(query, state))
            );
            writeRow(rSheet, idx + 2, buildRowValues(query, processed));
            setRowStatus(rSheet, idx + 2, processed.status);
          } catch (err) {
            errors++;
            writeRow(rSheet, idx + 2, [
              query,
              "",
              RESULT_STATUS.ERROR,
              "error",
              "-",
              "-",
              "-",
              "-",
              "-",
              "-",
              "-",
              "-",
              "",
              "",
              "",
              "",
              err instanceof Error ? err.message : String(err)
            ]);
            writeLog("ERROR", `Row failed "${query}": ${err instanceof Error ? err.message : err}`);
            setRowStatus(rSheet, idx + 2, RESULT_STATUS.ERROR);
          }
          done++;
          Utilities.sleep(cfg.rateLimitMs);
        });
        return { done, errors };
      };
      blankState = () => ({
        personaPrompt: "",
        status: RESULT_STATUS.INVISIBLE,
        checkStatus: "pending",
        gptRank: "-",
        gptUrl: "-",
        gptRankWeb: "-",
        gptUrlWeb: "-",
        gemRank: "-",
        gemUrl: "-",
        gemRankWeb: "-",
        gemUrlWeb: "-",
        gptNoAll: "",
        gptWebAll: "",
        gemNoAll: "",
        gemWebAll: ""
      });
      processRow = (query, cfg, rowIndex, onPartial) => {
        const target = normalizeDomain(cfg.targetDomain);
        const state = blankState();
        const update = (patch) => {
          Object.assign(state, patch);
          onPartial?.({ ...state });
        };
        const persona = generatePersona(query, cfg);
        writeLog("INFO", `Persona generated for "${query}" [row ${rowIndex}]: ${persona}`);
        update({ personaPrompt: persona, checkStatus: "processing" });
        const gptNo = queryOpenAINoTools(persona, cfg, query);
        update({
          gptNoAll: serializeResults(gptNo),
          gptRank: findRank(gptNo, target).rank,
          gptUrl: findRank(gptNo, target).url
        });
        const gptWeb = queryOpenAIWithTools(persona, cfg, query);
        const rWeb = findRank(gptWeb, target);
        update({
          gptWebAll: serializeResults(gptWeb),
          gptRankWeb: rWeb.rank,
          gptUrlWeb: rWeb.url
        });
        const gemNo = queryGeminiNoGrounding(persona, cfg, query);
        const rGemNo = findRank(gemNo, target);
        update({
          gemNoAll: serializeResults(gemNo),
          gemRank: rGemNo.rank,
          gemUrl: rGemNo.url
        });
        const gemWeb = queryGeminiWithGrounding(persona, cfg, query);
        const rGemWeb = findRank(gemWeb, target);
        update({
          gemWebAll: serializeResults(gemWeb),
          gemRankWeb: rGemWeb.rank,
          gemUrlWeb: rGemWeb.url
        });
        const r1 = findRank(gptNo, target);
        const r2 = rWeb;
        const r3 = rGemNo;
        const r4 = rGemWeb;
        let status = RESULT_STATUS.INVISIBLE;
        if (!gptNo && !gptWeb && !gemNo && !gemWeb) status = RESULT_STATUS.ERROR;
        else if ([r1, r2, r3, r4].some((r) => r.rank !== "-")) {
          status = RESULT_STATUS.VISIBLE;
          if (r1.rank === "-" && r3.rank === "-" && (r2.rank !== "-" || r4.rank !== "-")) {
            status = RESULT_STATUS.TOOL_ONLY;
          }
        }
        update({ status, checkStatus: "done" });
        return { ...state };
      };
      generatePersona = (keyword, cfg) => {
        const systemPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.persona_system || "",
          cfg.userLocation
        );
        const system = `${systemPrompt}
IMPORTANT: You MUST return the result in the language code: ${cfg.language.toUpperCase()}`;
        const messages = [
          { role: "system", content: system },
          { role: "user", content: keyword }
        ];
        const resp = callOpenAIChat(cfg.openaiKey, cfg.modelOpenai, messages, `Persona for "${keyword}"`);
        if (!resp) throw new Error("Persona generation failed");
        return resp;
      };
      queryOpenAINoTools = (prompt, cfg, label) => {
        const systemPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.search_openai_no_tools_system || "",
          cfg.userLocation
        );
        const userPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.search_openai_no_tools_user || "",
          cfg.userLocation,
          prompt
        );
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ];
        const content = callOpenAIChat(cfg.openaiKey, cfg.modelOpenai, messages, `OpenAI NoTools for "${label}"`);
        return parseSerpJson(content || "");
      };
      queryOpenAIWithTools = (prompt, cfg, label) => {
        const systemPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.search_openai_with_tools_system || "",
          cfg.userLocation
        );
        const userPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.search_openai_with_tools_user || "",
          cfg.userLocation,
          prompt
        );
        const body = {
          model: cfg.modelOpenai,
          input: `${systemPrompt}

${userPrompt}`,
          tools: [
            {
              type: "web_search",
              user_location: {
                type: "approximate",
                city: cityFromLocation(cfg.userLocation),
                country: cfg.countryCode || LOCATION_CONFIG.DEFAULT_COUNTRY_CODE
              }
            }
          ]
        };
        const resp = callOpenAIResponse(cfg.openaiKey, body, `OpenAI WithTools for "${label}"`);
        const text = extractOpenAIResponseText(resp);
        return parseSerpJson(text || "");
      };
      queryGeminiNoGrounding = (prompt, cfg, label) => {
        const textPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.search_gemini_no_grounding || "",
          cfg.userLocation,
          prompt
        );
        const body = {
          contents: [
            {
              role: "user",
              parts: [{ text: textPrompt }]
            }
          ],
          generationConfig: { temperature: 0.2 }
        };
        const resp = callGemini(cfg.geminiKey, cfg.modelGemini, body, `Gemini NoGrounding for "${label}"`);
        const text = extractTextFromGemini(resp);
        return parseSerpJson(text || "");
      };
      queryGeminiWithGrounding = (prompt, cfg, label) => {
        const textPrompt = replacePromptPlaceholders(
          DEFAULT_PROMPTS.search_gemini_with_grounding || "",
          cfg.userLocation,
          prompt
        );
        const body = {
          contents: [
            {
              role: "user",
              parts: [{ text: textPrompt }]
            }
          ],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.2 }
        };
        const resp = callGemini(cfg.geminiKey, cfg.modelGemini, body, `Gemini WithGrounding for "${label}"`);
        const grounding = extractGeminiGroundingUrls(resp);
        if (grounding && grounding.length) return grounding;
        const text = extractTextFromGemini(resp);
        return parseSerpJson(text || "");
      };
      callOpenAIChat = (apiKey, model, messages, label) => {
        const payload = { model, messages };
        const resp = httpPostJson(
          label || "OpenAI Chat",
          "https://api.openai.com/v1/chat/completions",
          payload,
          {
            Authorization: "Bearer " + apiKey
          }
        );
        const choice = resp.choices && resp.choices[0];
        return choice && choice.message && choice.message.content ? choice.message.content : "";
      };
      callOpenAIResponse = (apiKey, body, label) => {
        return httpPostJson(label || "OpenAI Responses", "https://api.openai.com/v1/responses", body, {
          Authorization: "Bearer " + apiKey
        });
      };
      callGemini = (apiKey, model, body, label) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        return httpPostJson(label || `Gemini ${model}`, url, body, {});
      };
      httpPostJson = (label, url, payload, headers) => {
        writeLog("INFO", `${label} \u2192 ${url} | payload=${stringifySafe(payload, 1200)}`);
        const resp = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          headers,
          muteHttpExceptions: true
        });
        const code = resp.getResponseCode();
        const body = resp.getContentText();
        writeLog("INFO", `${label} \u2190 HTTP ${code} | body=${body.slice(0, 1200)}${body.length > 1200 ? "... (truncated)" : ""}`);
        if (code >= 300) {
          throw new Error(`HTTP ${code}: ${body}`);
        }
        return JSON.parse(body);
      };
      extractTextFromGemini = (resp) => {
        const candidates = resp.candidates || [];
        const parts = candidates[0]?.content?.parts || [];
        return parts.map((p) => p.text || "").join("");
      };
      extractOpenAIResponseText = (resp) => {
        if (!resp) return "";
        if (resp.output_text) return resp.output_text;
        if (Array.isArray(resp.output)) {
          for (const item of resp.output) {
            const contentArray = item?.content;
            if (Array.isArray(contentArray)) {
              const text = contentArray.map((c) => c?.text || "").join("");
              if (text.trim()) return text;
            }
            const messageContent = item?.message?.content;
            if (Array.isArray(messageContent)) {
              const text = messageContent.map((c) => c?.text || "").join("");
              if (text.trim()) return text;
            }
            if (typeof item?.text === "string" && item.text.trim()) return item.text;
          }
        }
        return "";
      };
      findRank = (results, target) => {
        if (!results || !results.length) return { rank: "-", url: "-" };
        const found = results.find((r) => r.domain.includes(target) || r.url.includes(target));
        if (found) return { rank: found.rank, url: found.url };
        return { rank: "-", url: "-" };
      };
      serializeResults = (results) => {
        if (!results || !results.length) return "";
        return results.map((r) => `${r.rank}: ${r.url}`).join("\n");
      };
      stringifySafe = (value, maxLen = 1500) => {
        try {
          const json = JSON.stringify(value);
          return json.length > maxLen ? `${json.slice(0, maxLen)}... (truncated)` : json;
        } catch (e) {
          return String(value);
        }
      };
    }
  });

  // src/gas/index.ts
  var require_index = __commonJS({
    "src/gas/index.ts"() {
      init_constants();
      init_sheet_utils();
      init_pipeline();
      function onOpen() {
        ensureSheets();
        SpreadsheetApp.getUi().createMenu("AI Visibility (GAS)").addItem("Run next batch", "runNextBatch").addItem("Run errors again", "runErrorsAgain").addItem("Setup / Keys", "showSetupSidebar").addItem("Cancel current run", "requestCancel").addItem("Full restart (clear results)", "fullRestart").addItem("Factory reset (keep API keys)", "factoryResetKeepKeys").addItem("Factory reset (everything)", "factoryResetAll").addToUi();
        const cfg = readSettings();
        if (!ensureConfigReady(cfg)) {
          showSetupSidebar();
        }
      }
      function showSetupSidebar() {
        ensureSheets();
        const cfg = readSettings();
        const html = HtmlService.createHtmlOutput(`
    <div style="font-family:Arial;padding:10px;line-height:1.4">
      <h3>AI Visibility \u2013 Setup</h3>
      <p>Keys are stored in Script Properties (not in the sheet). Settings are stored in the Settings tab.</p>
      <label>OpenAI API Key<br>
        <input type="password" id="openaiKey" style="width:100%" placeholder="sk-..." value="${cfg.openaiKey || ""}">
        <label><input type="checkbox" id="openaiShow"> Show</label>
      </label><br><br>
      <label>Gemini API Key<br>
        <input type="password" id="geminiKey" style="width:100%" placeholder="AIza..." value="${cfg.geminiKey || ""}">
        <label><input type="checkbox" id="geminiShow"> Show</label>
      </label><br><br>
      <label>Target Domain<br><input id="target" style="width:100%" value="${cfg.targetDomain || ""}" placeholder="example.com"></label><br><br>
      <label>User Location<br><input id="location" style="width:100%" value="${cfg.userLocation || ""}" placeholder="City, Country"></label><br><br>
      <label>Language / Market<br>
        <select id="language" style="width:100%">
          ${getLanguageOptions(cfg.language || "de-AT")}
        </select>
      </label><br><br>
      <label>Country (ISO-2 for web search)<br>
        <select id="country" style="width:100%">
          ${getCountryOptions(cfg.countryCode || "AT")}
        </select>
      </label><br><br>
      <label>Batch size per run<br><input id="batch" style="width:100%" value="${cfg.batchSize}"></label><br><br>
      <button onclick="save()">Save</button>
      <div id="msg" style="margin-top:8px;color:green"></div>
      <script>
        function toggle(id, boxId){
          const inp = document.getElementById(id);
          const box = document.getElementById(boxId);
          box.addEventListener('change', () => {
            inp.type = box.checked ? 'text' : 'password';
          });
        }
        toggle('openaiKey','openaiShow');
        toggle('geminiKey','geminiShow');
        function save(){
          const form = {
            openaiKey: document.getElementById('openaiKey').value,
            geminiKey: document.getElementById('geminiKey').value,
            target: document.getElementById('target').value,
            location: document.getElementById('location').value,
            language: document.getElementById('language').value,
            country: document.getElementById('country').value,
            batch: document.getElementById('batch').value,
          };
          google.script.run.withSuccessHandler(() => {
            document.getElementById('msg').textContent = 'Saved. You can close this.';
          }).saveSetup(form);
        }
      </script>
    </div>
  `).setTitle("AI Visibility Setup").setWidth(320);
        SpreadsheetApp.getUi().showSidebar(html);
      }
      function saveSetup(form) {
        const props = PropertiesService.getScriptProperties();
        if (form.openaiKey) props.setProperty("OPENAI_API_KEY", form.openaiKey.trim());
        if (form.geminiKey) props.setProperty("GEMINI_API_KEY", form.geminiKey.trim());
        const settings = SpreadsheetApp.getActive().getSheetByName(SHEETS.SETTINGS);
        const rows = settings.getRange(2, 1, settings.getLastRow() - 1, 2).getValues();
        const map = new Map(rows.map(([k, v]) => [k, v]));
        if (form.target) map.set("TARGET_DOMAIN", form.target.trim());
        if (form.location) map.set("USER_LOCATION", form.location.trim());
        if (form.language) map.set("LANGUAGE", form.language.trim());
        if (form.country) map.set("COUNTRY_CODE", form.country.trim());
        if (form.batch) map.set("BATCH_SIZE", Number(form.batch));
        if (!map.get("TARGET_DOMAIN") || !map.get("USER_LOCATION") || !map.get("LANGUAGE")) {
          throw new Error("TARGET_DOMAIN, USER_LOCATION, and LANGUAGE are required");
        }
        const newRows = Array.from(map.entries()).map(([k, v]) => [k, v]);
        settings.getRange(2, 1, newRows.length, 2).setValues(newRows);
        writeLog("INFO", "Settings saved via sidebar");
      }
      function runNextBatch() {
        try {
          ensureSheets();
          const cfg = readSettings();
          if (!ensureConfigReady(cfg)) {
            showSetupSidebar();
            return;
          }
          validateConfig(cfg);
          seedResultsFromQueries();
          PropertiesService.getScriptProperties().deleteProperty("RUN_CANCEL");
          const processed = processBatch(cfg, shouldCancel);
          SpreadsheetApp.getActive().toast(
            `Processed ${processed.done} (${processed.errors} errors).`,
            "AI Visibility",
            8
          );
        } catch (e) {
          writeLog("ERROR", e instanceof Error ? e.message : String(e));
          SpreadsheetApp.getUi().alert("Run failed: " + (e instanceof Error ? e.message : e));
        }
      }
      function runErrorsAgain() {
        try {
          ensureSheets();
          const cfg = readSettings();
          if (!ensureConfigReady(cfg)) {
            showSetupSidebar();
            return;
          }
          validateConfig(cfg);
          const ss = SpreadsheetApp.getActive();
          const rSheet = ss.getSheetByName(SHEETS.RESULTS);
          const data = rSheet.getRange(2, 1, rSheet.getLastRow() - 1, OUTPUT_HEADERS.length).getValues();
          const errorRows = data.map((row, idx) => ({ row, idx })).filter(({ row }) => row[2] === RESULT_STATUS.ERROR);
          if (!errorRows.length) {
            SpreadsheetApp.getUi().alert("No error rows to re-run.");
            return;
          }
          PropertiesService.getScriptProperties().deleteProperty("RUN_CANCEL");
          let done = 0;
          let errors = 0;
          errorRows.forEach(({ row, idx }) => {
            if (shouldCancel()) throw new Error("Run cancelled");
            const query = row[0];
            try {
              setRowStatus(rSheet, idx + 2, "processing");
              const processed = processRow(String(query), cfg, idx + 2);
              writeRow(rSheet, idx + 2, [
                query,
                processed.personaPrompt,
                processed.status,
                processed.checkStatus,
                processed.gptRank,
                processed.gptUrl,
                processed.gptRankWeb,
                processed.gptUrlWeb,
                processed.gemRank,
                processed.gemUrl,
                processed.gemRankWeb,
                processed.gemUrlWeb,
                processed.gptNoAll,
                processed.gptWebAll,
                processed.gemNoAll,
                processed.gemWebAll,
                processed.error || ""
              ]);
              setRowStatus(rSheet, idx + 2, processed.status);
            } catch (err) {
              errors++;
              writeRow(rSheet, idx + 2, [
                query,
                "",
                RESULT_STATUS.ERROR,
                "error",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "",
                "",
                "",
                "",
                err instanceof Error ? err.message : String(err)
              ]);
              setRowStatus(rSheet, idx + 2, RESULT_STATUS.ERROR);
              writeLog("ERROR", `Row failed "${query}": ${err instanceof Error ? err.message : err}`);
            }
            done++;
            Utilities.sleep(cfg.rateLimitMs);
          });
          SpreadsheetApp.getActive().toast(`Re-ran ${done} error rows (${errors} errors).`, "AI Visibility", 6);
        } catch (e) {
          writeLog("ERROR", e instanceof Error ? e.message : String(e));
          SpreadsheetApp.getUi().alert("Run failed: " + (e instanceof Error ? e.message : e));
        }
      }
      var shouldCancel = () => {
        return PropertiesService.getScriptProperties().getProperty("RUN_CANCEL") === "1";
      };
      function requestCancel() {
        PropertiesService.getScriptProperties().setProperty("RUN_CANCEL", "1");
        writeLog("INFO", "Cancel requested");
        SpreadsheetApp.getActive().toast("Cancel requested. Current batch will stop soon.", "AI Visibility", 5);
      }
      function fullRestart() {
        const ui = SpreadsheetApp.getUi();
        const res = ui.alert("Full restart", "Clear all results (Queries stay)?", ui.ButtonSet.YES_NO);
        if (res !== ui.Button.YES) return;
        const rSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.RESULTS);
        if (rSheet.getLastRow() > 1) {
          rSheet.getRange(2, 1, rSheet.getLastRow() - 1, OUTPUT_HEADERS.length).clearContent();
          rSheet.getRange(2, 3, rSheet.getLastRow(), 1).setBackground(null);
        }
        PropertiesService.getScriptProperties().deleteProperty("RUN_CANCEL");
        SpreadsheetApp.getActive().toast("Results cleared. Run next batch to start.", "AI Visibility", 5);
        writeLog("INFO", "Full restart executed");
      }
      var clearLogs = () => {
        const logSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.LOGS);
        if (logSheet.getLastRow() > 1) {
          logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 3).clearContent();
        }
      };
      function factoryResetKeepKeys() {
        const ui = SpreadsheetApp.getUi();
        const res = ui.alert("Factory reset (keep API keys)", "Clear results, logs, and reset settings to defaults? API keys stay.", ui.ButtonSet.YES_NO);
        if (res !== ui.Button.YES) return;
        fullRestart();
        clearLogs();
        resetSettingsSheet();
        writeLog("INFO", "Factory reset (keep keys) executed");
      }
      function factoryResetAll() {
        const ui = SpreadsheetApp.getUi();
        const res = ui.alert("Factory reset (everything)", "Clear results, logs, settings, AND API keys?", ui.ButtonSet.YES_NO);
        if (res !== ui.Button.YES) return;
        fullRestart();
        clearLogs();
        resetSettingsSheet();
        const props = PropertiesService.getScriptProperties();
        props.deleteProperty("OPENAI_API_KEY");
        props.deleteProperty("GEMINI_API_KEY");
        writeLog("INFO", "Factory reset (all) executed");
        SpreadsheetApp.getActive().toast("Factory reset done. Re-open setup to enter keys.", "AI Visibility", 5);
      }
      globalThis.onOpen = onOpen;
      globalThis.runNextBatch = runNextBatch;
      globalThis.showSetupSidebar = showSetupSidebar;
      globalThis.saveSetup = saveSetup;
      globalThis.requestCancel = requestCancel;
      globalThis.fullRestart = fullRestart;
      globalThis.factoryResetKeepKeys = factoryResetKeepKeys;
      globalThis.factoryResetAll = factoryResetAll;
      globalThis.runErrorsAgain = runErrorsAgain;
    }
  });
  require_index();
})();
// Expose named functions for the Apps Script UI picker
var __onOpen = globalThis.onOpen;
var __runNextBatch = globalThis.runNextBatch;
var __showSetupSidebar = globalThis.showSetupSidebar;
var __saveSetup = globalThis.saveSetup;
var __requestCancel = globalThis.requestCancel;
var __fullRestart = globalThis.fullRestart;
function onOpen(){ return __onOpen && __onOpen(); }
function runNextBatch(){ return __runNextBatch && __runNextBatch(); }
function showSetupSidebar(){ return __showSetupSidebar && __showSetupSidebar(); }
function saveSetup(form){ return __saveSetup && __saveSetup(form); }
function requestCancel(){ return __requestCancel && __requestCancel(); }
function fullRestart(){ return __fullRestart && __fullRestart(); }
