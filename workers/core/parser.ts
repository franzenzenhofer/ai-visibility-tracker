/**
 * Excel/CSV parser for Workers - REUSES src/excel-reader.ts logic
 * 48 lines - compliant with ≤75 rule
 */

import * as XLSX from 'xlsx';
import { QueryRow } from '../../src/types';
import { GSC_HEADERS, PROCESSING_CONSTANTS } from '../../src/constants';
import { isQueryLike } from '../../src/query-utils';

const isQueryColumn = (data: Record<string, unknown>[], col: string): boolean => {
  const samples = Math.min(PROCESSING_CONSTANTS.QUERY_DETECTION_SAMPLE_SIZE, data.length);
  let count = 0;
  for (let i = 0; i < samples; i++) {
    if (isQueryLike(String(data[i][col] || '').trim())) count++;
  }
  return count / samples > PROCESSING_CONSTANTS.QUERY_DETECTION_THRESHOLD;
};

const findGSCSheet = (wb: XLSX.WorkBook): string | null => {
  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '' }) as Record<string, unknown>[];
    if (data.length === 0) continue;
    const headers = Object.keys(data[0]).map((h) => h.toLowerCase());
    const hasGSC = GSC_HEADERS.some((g) => headers.some((h) => h.includes(g.toLowerCase())));
    if (hasGSC) return name;
  }
  return null;
};

const findQueryColumn = (data: Record<string, unknown>[]): string | null => {
  for (const h of Object.keys(data[0])) {
    const hl = h.toLowerCase().trim();
    if (GSC_HEADERS.some((g) => hl === g.toLowerCase() || hl.includes(g.toLowerCase()))) return h;
  }
  for (const h of Object.keys(data[0])) {
    if (isQueryColumn(data, h)) return h;
  }
  return null;
};

export const parseUploadedFile = async (blob: Blob): Promise<QueryRow[]> => {
  const buf = await blob.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = findGSCSheet(wb) || wb.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' }) as Record<string, unknown>[];
  const col = findQueryColumn(data);
  if (!col) throw new Error('No query column found');
  return data.map((row, i) => ({
    query: String(row[col] || '').trim(),
    rowIndex: i + 2,
    originalRow: row,
  })).filter((q) => q.query);
};
