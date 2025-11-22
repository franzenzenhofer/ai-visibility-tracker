/**
 * Output writer for results
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ProcessedResult, SerpResult } from './types';
import chalk from 'chalk';

/**
 * Write results to CSV file
 */
export const writeResultsToCSV = (results: ProcessedResult[], outputPath: string): void => {
  const rows = [
    [
      'Original Query',
      'Persona Prompt',
      'Status',
      'GPT Rank',
      'GPT URL',
      'GPT Rank (Web)',
      'GPT URL (Web)',
      'Gemini Rank',
      'Gemini URL',
      'Gemini Rank (Web)',
      'Gemini URL (Web)',
    ],
  ];

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

  // Convert to CSV
  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  fs.writeFileSync(outputPath, csv, 'utf-8');
};

/**
 * Write results to Excel file
 */
export const writeResultsToExcel = (results: ProcessedResult[], outputPath: string): void => {
  const rows = [
    [
      'Original Query',
      'Persona Prompt',
      'Status',
      'GPT Rank',
      'GPT URL',
      'GPT Rank (Web)',
      'GPT URL (Web)',
      'Gemini Rank',
      'Gemini URL',
      'Gemini Rank (Web)',
      'Gemini URL (Web)',
    ],
  ];

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
 * Format SerpResult array for console output
 */
const formatSerpResults = (results: SerpResult[], targetDomain: string): string => {
  if (!results || results.length === 0) {
    return chalk.gray('  No results');
  }

  return results
    .map(r => {
      const isTarget = r.domain.includes(targetDomain) || r.url.includes(targetDomain);
      const rankStr = chalk.cyan(`  ${r.rank}.`);
      const domainStr = isTarget ? chalk.green.bold(r.domain) : chalk.white(r.domain);
      const urlStr = isTarget ? chalk.green(r.url) : chalk.gray(r.url);
      return `${rankStr} ${domainStr}\n     ${urlStr}`;
    })
    .join('\n');
};

/**
 * Display results to console/terminal
 */
export const displayResultsToConsole = (results: ProcessedResult[], targetDomain: string): void => {
  console.log('\n' + chalk.bold('═'.repeat(80)));
  console.log(chalk.bold.cyan('📊 AI VISIBILITY RESULTS'));
  console.log(chalk.bold('═'.repeat(80)) + '\n');

  results.forEach((result, index) => {
    // Header
    console.log(chalk.bold.yellow(`[${index + 1}] ${result.originalQuery}`));
    console.log(chalk.gray(`    Persona: "${result.personaPrompt}"`));

    // Status
    let statusText = '';
    switch (result.status) {
      case 'visible':
        statusText = chalk.green.bold('✅ VISIBLE');
        break;
      case 'tool-only':
        statusText = chalk.yellow.bold('⚠️  TOOL-ONLY');
        break;
      case 'invisible':
        statusText = chalk.red.bold('❌ INVISIBLE');
        break;
      case 'error':
        statusText = chalk.red.bold('⛔ ERROR');
        break;
    }
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
