/**
 * Console output utilities with colors
 */

import chalk from 'chalk';
import { ProcessedResult, SerpResult } from './types';
import { RESULT_STATUS } from './constants';

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
 * @param debugMode - Show all 4 variants (default: false)
 */
export const displayResultsToConsole = (
  results: ProcessedResult[],
  targetDomain: string,
  debugMode: boolean = false
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

    if (debugMode) {
      // DEBUG MODE: Show all 4 variants
      console.log(chalk.bold('  🤖 GPT (No Web Search):'));
      console.log(formatSerpResults(result.gptNoToolResults, targetDomain) + '\n');

      console.log(chalk.bold('  🌐 GPT (WITH Web Search):'));
      console.log(formatSerpResults(result.gptWithToolResults, targetDomain) + '\n');

      console.log(chalk.bold('  🧠 Gemini (No Grounding):'));
      console.log(formatSerpResults(result.gemNoGroundingResults, targetDomain) + '\n');

      console.log(chalk.bold('  🔍 Gemini (WITH Google Search):'));
      console.log(formatSerpResults(result.gemWithGroundingResults, targetDomain) + '\n');
    } else {
      // NORMAL MODE: Show summary of where domain was found
      const foundIn: string[] = [];

      if (result.gptRank !== '-') {
        foundIn.push(`GPT (rank ${result.gptRank})`);
      }
      if (result.gptRankWeb !== '-') {
        foundIn.push(`GPT+Web (rank ${result.gptRankWeb})`);
      }
      if (result.gemRank !== '-') {
        foundIn.push(`Gemini (rank ${result.gemRank})`);
      }
      if (result.gemRankWeb !== '-') {
        foundIn.push(`Gemini+Search (rank ${result.gemRankWeb})`);
      }

      if (foundIn.length > 0) {
        console.log(chalk.green(`  ✓ Found in: ${foundIn.join(', ')}`));
        // Show the best ranking URL
        const bestUrl = result.gptUrl !== '-' ? result.gptUrl :
                       result.gptUrlWeb !== '-' ? result.gptUrlWeb :
                       result.gemUrl !== '-' ? result.gemUrl : result.gemUrlWeb;
        console.log(chalk.gray(`  → ${bestUrl}`));
      } else {
        console.log(chalk.gray('  ✗ Not found in any variant'));
        console.log(chalk.gray('  → Use --debug to see all search results'));
      }
      console.log();
    }

    console.log(chalk.gray('─'.repeat(80)) + '\n');
  });
};
