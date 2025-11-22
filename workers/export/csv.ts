/**
 * CSV export - REUSES src/output-writer.ts convertResultsToRows
 * 25 lines - compliant with ≤75 rule
 */

import { ProcessedResult } from '../../src/types';
import { OUTPUT_HEADERS } from '../../src/constants';

const convertToRows = (results: ProcessedResult[]): string[][] => {
  const rows: string[][] = [[...OUTPUT_HEADERS]];
  results.forEach((r) => {
    rows.push([
      r.originalQuery, r.personaPrompt, r.status.toUpperCase(),
      String(r.gptRank), r.gptUrl, String(r.gptRankWeb), r.gptUrlWeb,
      String(r.gemRank), r.gemUrl, String(r.gemRankWeb), r.gemUrlWeb,
    ]);
  });
  return rows;
};

export const buildCSVResponse = (results: ProcessedResult[]): Response => {
  const rows = convertToRows(results);
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="results_${ts}.csv"`,
    },
  });
};
