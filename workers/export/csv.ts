/**
 * CSV export - REUSES src/output-formatters.ts convertResultsToRows (TRUE DRY!)
 * 13 lines - compliant with ≤75 rule
 */

import { ProcessedResult } from '../../src/types';
import { convertResultsToRows } from '../../src/output-formatters';

export const buildCSVResponse = (results: ProcessedResult[]): Response => {
  const rows = convertResultsToRows(results);
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="results_${ts}.csv"`,
    },
  });
};
