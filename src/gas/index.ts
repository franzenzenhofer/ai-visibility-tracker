/* global SpreadsheetApp, PropertiesService, HtmlService, Utilities */
/**
 * Google Apps Script entrypoint (generated via build:gas)
 * - Uses prompts/settings pulled from geo-visibility-config.toml (via build script)
 * - Provides a menu, onboarding sidebar, and batch processor
 */

import { RESULT_STATUS } from '../constants';
import {
  ensureSheets,
  readSettings,
  resetSettingsSheet,
  writeLog,
  seedResultsFromQueries,
  validateConfig,
  ensureConfigReady,
  getLanguageOptions,
  getCountryOptions,
  setRowStatus,
  writeRow,
  OUTPUT_HEADERS,
  SHEETS,
} from './sheet-utils';
import { processBatch, processRow } from './pipeline';

/* ---------- Menu & onboarding ---------- */

function onOpen(): void {
  ensureSheets();
  SpreadsheetApp.getUi()
    .createMenu('AI Visibility (GAS)')
    .addItem('Run next batch', 'runNextBatch')
    .addItem('Run errors again', 'runErrorsAgain')
    .addItem('Setup / Keys', 'showSetupSidebar')
    .addItem('Cancel current run', 'requestCancel')
    .addItem('Full restart (clear results)', 'fullRestart')
    .addItem('Factory reset (keep API keys)', 'factoryResetKeepKeys')
    .addItem('Factory reset (everything)', 'factoryResetAll')
    .addToUi();

  const cfg = readSettings();
  if (!ensureConfigReady(cfg)) {
    showSetupSidebar();
  }
}

function showSetupSidebar(): void {
  ensureSheets();
  const cfg = readSettings();
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family:Arial;padding:10px;line-height:1.4">
      <h3>AI Visibility – Setup</h3>
      <p>Keys are stored in Script Properties (not in the sheet). Settings are stored in the Settings tab.</p>
      <label>OpenAI API Key<br>
        <input type="password" id="openaiKey" style="width:100%" placeholder="sk-..." value="${cfg.openaiKey || ''}">
        <label><input type="checkbox" id="openaiShow"> Show</label>
      </label><br><br>
      <label>Gemini API Key<br>
        <input type="password" id="geminiKey" style="width:100%" placeholder="AIza..." value="${cfg.geminiKey || ''}">
        <label><input type="checkbox" id="geminiShow"> Show</label>
      </label><br><br>
      <label>Target Domain<br><input id="target" style="width:100%" value="${cfg.targetDomain || ''}" placeholder="example.com"></label><br><br>
      <label>User Location<br><input id="location" style="width:100%" value="${cfg.userLocation || ''}" placeholder="City, Country"></label><br><br>
      <label>Language / Market<br>
        <select id="language" style="width:100%">
          ${getLanguageOptions(cfg.language || 'de-AT')}
        </select>
      </label><br><br>
      <label>Country (ISO-2 for web search)<br>
        <select id="country" style="width:100%">
          ${getCountryOptions(cfg.countryCode || 'AT')}
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
  `).setTitle('AI Visibility Setup').setWidth(320);

  SpreadsheetApp.getUi().showSidebar(html);
}

function saveSetup(form: {
  openaiKey?: string;
  geminiKey?: string;
  target?: string;
  location?: string;
  language?: string;
  country?: string;
  batch?: string;
}): void {
  const props = PropertiesService.getScriptProperties();
  if (form.openaiKey) props.setProperty('OPENAI_API_KEY', form.openaiKey.trim());
  if (form.geminiKey) props.setProperty('GEMINI_API_KEY', form.geminiKey.trim());

  const settings = SpreadsheetApp.getActive().getSheetByName(SHEETS.SETTINGS);
  const rows = settings
    .getRange(2, 1, settings.getLastRow() - 1, 2)
    .getValues() as Array<[string, string]>;
  const map = new Map<string, string | number>(rows.map(([k, v]: [string, string]) => [k, v]));
  if (form.target) map.set('TARGET_DOMAIN', form.target.trim());
  if (form.location) map.set('USER_LOCATION', form.location.trim());
  if (form.language) map.set('LANGUAGE', form.language.trim());
  if (form.country) map.set('COUNTRY_CODE', form.country.trim());
  if (form.batch) map.set('BATCH_SIZE', Number(form.batch));
  if (!map.get('TARGET_DOMAIN') || !map.get('USER_LOCATION') || !map.get('LANGUAGE')) {
    throw new Error('TARGET_DOMAIN, USER_LOCATION, and LANGUAGE are required');
  }

  const newRows = Array.from(map.entries()).map(([k, v]) => [k, v]);
  settings.getRange(2, 1, newRows.length, 2).setValues(newRows);
  writeLog('INFO', 'Settings saved via sidebar');
}

/* ---------- Processing pipeline ---------- */

function runNextBatch(): void {
  try {
    ensureSheets();
    const cfg = readSettings();
    if (!ensureConfigReady(cfg)) {
      showSetupSidebar();
      return;
    }
    validateConfig(cfg);
    seedResultsFromQueries();
    PropertiesService.getScriptProperties().deleteProperty('RUN_CANCEL');

    const processed = processBatch(cfg, shouldCancel);
    SpreadsheetApp.getActive().toast(
      `Processed ${processed.done} (${processed.errors} errors).`,
      'AI Visibility',
      8
    );
  } catch (e) {
    writeLog('ERROR', e instanceof Error ? e.message : String(e));
    SpreadsheetApp.getUi().alert('Run failed: ' + (e instanceof Error ? e.message : e));
  }
}

function runErrorsAgain(): void {
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
    const data = rSheet.getRange(2, 1, rSheet.getLastRow() - 1, OUTPUT_HEADERS.length).getValues() as unknown[][];
    const errorRows = data
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row[2] === RESULT_STATUS.ERROR);
    if (!errorRows.length) {
      SpreadsheetApp.getUi().alert('No error rows to re-run.');
      return;
    }
    PropertiesService.getScriptProperties().deleteProperty('RUN_CANCEL');

    let done = 0;
    let errors = 0;
    errorRows.forEach(({ row, idx }) => {
      if (shouldCancel()) throw new Error('Run cancelled');
      const query = row[0] as string;
      try {
        setRowStatus(rSheet, idx + 2, 'processing');
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
          processed.error || '',
        ]);
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
        setRowStatus(rSheet, idx + 2, RESULT_STATUS.ERROR);
        writeLog('ERROR', `Row failed "${query}": ${err instanceof Error ? err.message : err}`);
      }
      done++;
      Utilities.sleep(cfg.rateLimitMs);
    });
    SpreadsheetApp.getActive().toast(`Re-ran ${done} error rows (${errors} errors).`, 'AI Visibility', 6);
  } catch (e) {
    writeLog('ERROR', e instanceof Error ? e.message : String(e));
    SpreadsheetApp.getUi().alert('Run failed: ' + (e instanceof Error ? e.message : e));
  }
}

/* ---------- Cancel & restart ---------- */

const shouldCancel = (): boolean => {
  return PropertiesService.getScriptProperties().getProperty('RUN_CANCEL') === '1';
};

function requestCancel(): void {
  PropertiesService.getScriptProperties().setProperty('RUN_CANCEL', '1');
  writeLog('INFO', 'Cancel requested');
  SpreadsheetApp.getActive().toast('Cancel requested. Current batch will stop soon.', 'AI Visibility', 5);
}

function fullRestart(): void {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('Full restart', 'Clear all results (Queries stay)?', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  const rSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.RESULTS);
  if (rSheet.getLastRow() > 1) {
    rSheet.getRange(2, 1, rSheet.getLastRow() - 1, OUTPUT_HEADERS.length).clearContent();
    rSheet.getRange(2, 3, rSheet.getLastRow(), 1).setBackground(null);
  }
  PropertiesService.getScriptProperties().deleteProperty('RUN_CANCEL');
  SpreadsheetApp.getActive().toast('Results cleared. Run next batch to start.', 'AI Visibility', 5);
  writeLog('INFO', 'Full restart executed');
}

const clearLogs = (): void => {
  const logSheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.LOGS);
  if (logSheet.getLastRow() > 1) {
    logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 3).clearContent();
  }
};

function factoryResetKeepKeys(): void {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('Factory reset (keep API keys)', 'Clear results, logs, and reset settings to defaults? API keys stay.', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  fullRestart();
  clearLogs();
  resetSettingsSheet();
  writeLog('INFO', 'Factory reset (keep keys) executed');
}

function factoryResetAll(): void {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('Factory reset (everything)', 'Clear results, logs, settings, AND API keys?', ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;
  fullRestart();
  clearLogs();
  resetSettingsSheet();
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('OPENAI_API_KEY');
  props.deleteProperty('GEMINI_API_KEY');
  writeLog('INFO', 'Factory reset (all) executed');
  SpreadsheetApp.getActive().toast('Factory reset done. Re-open setup to enter keys.', 'AI Visibility', 5);
}

/* ---------- Expose globals for Apps Script ---------- */
(globalThis as any).onOpen = onOpen;
(globalThis as any).runNextBatch = runNextBatch;
(globalThis as any).showSetupSidebar = showSetupSidebar;
(globalThis as any).saveSetup = saveSetup;
(globalThis as any).requestCancel = requestCancel;
(globalThis as any).fullRestart = fullRestart;
(globalThis as any).factoryResetKeepKeys = factoryResetKeepKeys;
(globalThis as any).factoryResetAll = factoryResetAll;
(globalThis as any).runErrorsAgain = runErrorsAgain;
