/**
 * File output utilities (CSV and Excel)
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ProcessedResult } from './types';
import { convertResultsToRows, generateOutputFilename } from './output-formatters';

/**
 * Write results to CSV file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write CSV
 */
export const writeResultsToCSV = (
  results: ProcessedResult[],
  outputPath: string
): void => {
  const rows = convertResultsToRows(results);

  // Convert to CSV with quoted cells
  const csv = rows
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  fs.writeFileSync(outputPath, csv, 'utf-8');
};

/**
 * Write results to Excel file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write Excel
 */
export const writeResultsToExcel = (
  results: ProcessedResult[],
  outputPath: string
): void => {
  const rows = convertResultsToRows(results);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

  XLSX.writeFile(workbook, outputPath);
};

/**
 * Ensure output directory exists
 */
const ensureDirectory = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Save results to file (CSV or Excel) in optional subdirectory
 */
export const saveResultsToFile = (
  results: ProcessedResult[],
  format: 'csv' | 'xlsx',
  outputDir?: string
): string => {
  const filename = generateOutputFilename(format);
  const filepath = outputDir ? path.join(outputDir, filename) : filename;

  // Ensure directory exists
  if (outputDir) {
    ensureDirectory(outputDir);
  }

  // Write file
  if (format === 'csv') {
    writeResultsToCSV(results, filepath);
  } else {
    writeResultsToExcel(results, filepath);
  }

  return filepath;
};
