/**
 * Excel sheet and column detection utilities
 */

import * as XLSX from 'xlsx';
import { GSC_HEADERS } from './constants';
import { isQueryLike } from './query-utils';
import { PROCESSING_CONSTANTS } from './constants';

/**
 * Check if a column contains query-like data
 *
 * @param data - Array of row data
 * @param columnName - Column name to check
 * @returns True if column appears to contain search queries
 */
const isQueryColumn = (
  data: Record<string, unknown>[],
  columnName: string
): boolean => {
  const samplesToCheck = Math.min(
    PROCESSING_CONSTANTS.QUERY_DETECTION_SAMPLE_SIZE,
    data.length
  );
  let queryLikeCount = 0;

  for (let i = 0; i < samplesToCheck; i++) {
    const value = String(data[i][columnName] || '').trim();

    if (isQueryLike(value)) {
      queryLikeCount++;
    }
  }

  return (
    queryLikeCount / samplesToCheck >
    PROCESSING_CONSTANTS.QUERY_DETECTION_THRESHOLD
  );
};

/**
 * Find the sheet containing GSC data
 */
export const findGSCSheet = (workbook: XLSX.WorkBook): string | null => {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

    if (data.length === 0) continue;

    const headers = Object.keys(data[0]).map(h => h.toLowerCase());

    // Check if this sheet has GSC-like headers
    const hasGSCHeaders = GSC_HEADERS.some((gscHeader: string) =>
      headers.some(h => h.includes(gscHeader.toLowerCase()) || gscHeader.toLowerCase().includes(h))
    );

    // Also check for common GSC columns
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
export const findQueryColumn = (data: Record<string, unknown>[]): string | null => {
  const headers = Object.keys(data[0]);

  // Method 1: Try exact or partial matches with known GSC headers
  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();

    for (const gscHeader of GSC_HEADERS) {
      const gscHeaderLower = gscHeader.toLowerCase();

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
