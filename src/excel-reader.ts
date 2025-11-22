/**
 * Excel file reader for GSC exports
 * Auto-detects correct sheet and column regardless of language
 */

import * as XLSX from 'xlsx';
import { QueryRow } from './types';
import { GSC_HEADERS } from './config';

/**
 * Check if a column contains query-like data
 */
const isQueryColumn = (data: Record<string, unknown>[], columnName: string): boolean => {
  // Check first 10 rows for query-like patterns
  const samplesToCheck = Math.min(10, data.length);
  let queryLikeCount = 0;

  for (let i = 0; i < samplesToCheck; i++) {
    const value = String(data[i][columnName] || '').trim();

    // Query characteristics:
    // - Contains text (not just numbers)
    // - Length between 2-200 characters
    // - Contains letters
    // - Not a URL
    if (
      value.length >= 2 &&
      value.length <= 200 &&
      /[a-zA-ZäöüßÄÖÜàáâãåèéêëìíîïòóôõùúûýÿčćđšžÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝŸČĆĐŠŽ]/.test(value) &&
      !value.startsWith('http') &&
      !value.startsWith('www.')
    ) {
      queryLikeCount++;
    }
  }

  // If more than 70% of samples look like queries, it's probably the query column
  return queryLikeCount / samplesToCheck > 0.7;
};

/**
 * Find the sheet containing GSC data
 */
const findGSCSheet = (workbook: XLSX.WorkBook): string | null => {
  // Try each sheet
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

    if (data.length === 0) continue;

    const headers = Object.keys(data[0]).map(h => h.toLowerCase());

    // Check if this sheet has GSC-like headers
    const hasGSCHeaders = GSC_HEADERS.some(gscHeader =>
      headers.some(h => h.includes(gscHeader.toLowerCase()) || gscHeader.toLowerCase().includes(h))
    );

    // Also check for common GSC columns: clicks, impressions, ctr, position
    const hasMetrics = ['clicks', 'impressions', 'ctr', 'position'].some(metric =>
      headers.some(h => h.includes(metric.toLowerCase()))
    );

    if (hasGSCHeaders || hasMetrics) {
      return sheetName;
    }
  }

  return null;
};

/**
 * Find the query column in the data
 */
const findQueryColumn = (data: Record<string, unknown>[]): string | null => {
  const headers = Object.keys(data[0]);

  // Method 1: Try exact or partial matches with known GSC headers
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();

    for (const gscHeader of GSC_HEADERS) {
      const gscHeaderLower = gscHeader.toLowerCase();

      // Exact match or contains
      if (headerLower === gscHeaderLower ||
          headerLower.includes(gscHeaderLower) ||
          gscHeaderLower.includes(headerLower)) {
        return header;
      }
    }
  }

  // Method 2: Find the first column that looks like it contains queries
  for (const header of headers) {
    if (isQueryColumn(data, header)) {
      console.log(`📍 Auto-detected query column: "${header}"`);
      return header;
    }
  }

  return null;
};

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
