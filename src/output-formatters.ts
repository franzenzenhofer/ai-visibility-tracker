/**
 * Output formatters for result data
 */

import { ProcessedResult } from './types';
import { OUTPUT_HEADERS } from './constants';

/**
 * Convert processed results to row array format
 *
 * @param results - Array of processed results
 * @returns Array of row arrays (header + data rows)
 */
export const convertResultsToRows = (
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
 * Generate output filename with timestamp
 */
export const generateOutputFilename = (format: 'csv' | 'xlsx'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `results_${timestamp}.${format}`;
};
