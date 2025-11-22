/**
 * Excel file reader for GSC exports
 * Auto-detects correct sheet and column regardless of language
 */

import * as XLSX from 'xlsx';
import { QueryRow } from './types';
import { GSC_HEADERS } from './config';
import { findGSCSheet, findQueryColumn } from './sheet-detector';

export const readExcelFile = (filePath: string): QueryRow[] => {
  try {
    const workbook = XLSX.readFile(filePath);

    // Find the correct sheet (auto-detect)
    let sheetName = findGSCSheet(workbook);

    if (!sheetName) {
      // Fallback to first sheet
      sheetName = workbook.SheetNames[0];
      console.log(`⚠️  Could not detect GSC sheet, using first sheet: "${sheetName}"`);
    } else {
      console.log(`✅ Detected GSC sheet: "${sheetName}"`);
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

    if (data.length === 0) {
      throw new Error(`Sheet "${sheetName}" is empty`);
    }

    // Find query column (auto-detect)
    const queryColumn = findQueryColumn(data);

    if (!queryColumn) {
      const headers = Object.keys(data[0]);
      throw new Error(
        `Could not detect query column. Available columns: ${headers.join(', ')}\n` +
        `Expected patterns: ${GSC_HEADERS.join(', ')}`
      );
    }

    console.log(`✅ Using query column: "${queryColumn}"`);

    // Extract queries
    const queries: QueryRow[] = [];
    data.forEach((row, index) => {
      const query = String(row[queryColumn] || '').trim();
      if (query) {
        queries.push({
          query,
          rowIndex: index + 2, // +2 because Excel is 1-indexed and has header
          originalRow: row,
        });
      }
    });

    if (queries.length === 0) {
      throw new Error(`No valid queries found in column "${queryColumn}"`);
    }

    console.log(`✅ Found ${queries.length} queries`);

    return queries;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read Excel file: ${error.message}`);
    }
    throw error;
  }
};
