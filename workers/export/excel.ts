/**
 * Excel export - REUSES src/output-writer.ts logic + xlsx
 * 31 lines - compliant with ≤75 rule
 */

import * as XLSX from 'xlsx';
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

export const buildExcelResponse = (results: ProcessedResult[]): Response => {
  const rows = convertToRows(results);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="results_${ts}.xlsx"`,
    },
  });
};
