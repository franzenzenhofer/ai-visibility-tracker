/**
 * JSON export - Simple JSON response builder
 * 16 lines - compliant with ≤75 rule
 */

import { ProcessedResult } from '../../src/types';

export const buildJSONResponse = (results: ProcessedResult[]): Response => {
  const json = JSON.stringify(results, null, 2);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="results_${ts}.json"`,
    },
  });
};
