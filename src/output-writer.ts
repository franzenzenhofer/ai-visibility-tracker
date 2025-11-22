/**
 * Output writer for results
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ProcessedResult, SerpResult } from './types';
import chalk from 'chalk';
import { OUTPUT_HEADERS, RESULT_STATUS } from './constants';

/**
 * Convert processed results to row array format
 *
 * @param results - Array of processed results
 * @returns Array of row arrays (header + data rows)
 */
const convertResultsToRows = (
  results: ProcessedResult[]
): Array<Array<string>> => {
  const rows: Array<Array<string>> = [[...OUTPUT_HEADERS] as Array<string>];

  results.forEach(result => {
    rows.push([
      result.originalQuery,
      result.personaPrompt,
      result.status.toUpperCase(),
      String(result.gptRank),
      result.gptUrl,
      String(result.gptRankWeb),
      result.gptUrlWeb,
      String(result.gemRank),
      result.gemUrl,
      String(result.gemRankWeb),
      result.gemUrlWeb,
    ]);
  });

  return rows;
};

/**
 * Write results to CSV file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write CSV
 */
export const writeResultsToCSV = (
  results: ProcessedResult[],
  outputPath: string
): void => {
  const rows = convertResultsToRows(results);

  // Convert to CSV with quoted cells
  const csv = rows
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  fs.writeFileSync(outputPath, csv, 'utf-8');
};

/**
 * Write results to Excel file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write Excel
 */
export const writeResultsToExcel = (
  results: ProcessedResult[],
  outputPath: string
): void => {
  const rows = convertResultsToRows(results);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

  XLSX.writeFile(workbook, outputPath);
};

/**
 * Generate output filename with timestamp
 */
export const generateOutputFilename = (format: 'csv' | 'xlsx'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `results_${timestamp}.${format}`;
};

/**
 * Format SerpResult array for console output with colors
 *
 * @param results - Array of SERP results
 * @param targetDomain - Domain to highlight
 * @returns Formatted string with colors
 */
const formatSerpResults = (
  results: SerpResult[],
  targetDomain: string
): string => {
  if (!results || results.length === 0) {
    return chalk.gray('  No results');
  }

  return results
    .map(r => {
      const isTarget =
        r.domain.includes(targetDomain) || r.url.includes(targetDomain);
      const rankStr = chalk.cyan(`  ${r.rank}.`);
      const domainStr = isTarget
        ? chalk.green.bold(r.domain)
        : chalk.white(r.domain);
      const urlStr = isTarget ? chalk.green(r.url) : chalk.gray(r.url);
      return `${rankStr} ${domainStr}\n     ${urlStr}`;
    })
    .join('\n');
};

/**
 * Get colored status text for display
 *
 * @param status - Result status
 * @returns Colored status string
 */
const getStatusText = (status: string): string => {
  switch (status) {
    case RESULT_STATUS.VISIBLE:
      return chalk.green.bold('✅ VISIBLE');
    case RESULT_STATUS.TOOL_ONLY:
      return chalk.yellow.bold('⚠️  TOOL-ONLY');
    case RESULT_STATUS.INVISIBLE:
      return chalk.red.bold('❌ INVISIBLE');
    case RESULT_STATUS.ERROR:
      return chalk.red.bold('⛔ ERROR');
    default:
      return chalk.gray('UNKNOWN');
  }
};

/**
 * Display results to console/terminal with colors
 *
 * @param results - Array of processed results
 * @param targetDomain - Domain to highlight
 */
export const displayResultsToConsole = (
  results: ProcessedResult[],
  targetDomain: string
): void => {
  console.log('\n' + chalk.bold('═'.repeat(80)));
  console.log(chalk.bold.cyan('📊 AI VISIBILITY RESULTS'));
  console.log(chalk.bold('═'.repeat(80)) + '\n');

  results.forEach((result, index) => {
    // Header
    console.log(chalk.bold.yellow(`[${index + 1}] ${result.originalQuery}`));
    console.log(chalk.gray(`    Persona: "${result.personaPrompt}"`));

    // Status
    const statusText = getStatusText(result.status);
    console.log(`    Status: ${statusText}\n`);

    // GPT without tools
    console.log(chalk.bold('  🤖 GPT (No Web Search):'));
    console.log(formatSerpResults(result.gptNoToolResults, targetDomain) + '\n');

    // GPT with tools
    console.log(chalk.bold('  🌐 GPT (WITH Web Search):'));
    console.log(formatSerpResults(result.gptWithToolResults, targetDomain) + '\n');

    // Gemini without grounding
    console.log(chalk.bold('  🧠 Gemini (No Grounding):'));
    console.log(formatSerpResults(result.gemNoGroundingResults, targetDomain) + '\n');

    // Gemini with grounding
    console.log(chalk.bold('  🔍 Gemini (WITH Google Search):'));
    console.log(formatSerpResults(result.gemWithGroundingResults, targetDomain) + '\n');

    console.log(chalk.gray('─'.repeat(80)) + '\n');
  });
};

/**
 * Ensure output directory exists
 */
const ensureDirectory = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Save results to file (CSV or Excel) in optional subdirectory
 */
export const saveResultsToFile = (
  results: ProcessedResult[],
  format: 'csv' | 'xlsx',
  outputDir?: string
): string => {
  const filename = generateOutputFilename(format);
  const filepath = outputDir ? path.join(outputDir, filename) : filename;

  // Ensure directory exists
  if (outputDir) {
    ensureDirectory(outputDir);
  }

  // Write file
  if (format === 'csv') {
    writeResultsToCSV(results, filepath);
  } else {
    writeResultsToExcel(results, filepath);
  }

  return filepath;
};
