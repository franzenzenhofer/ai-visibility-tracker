/**
 * Output writer for results
 */
import { ProcessedResult } from './types';
/**
 * Write results to CSV file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write CSV
 */
export declare const writeResultsToCSV: (results: ProcessedResult[], outputPath: string) => void;
/**
 * Write results to Excel file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write Excel
 */
export declare const writeResultsToExcel: (results: ProcessedResult[], outputPath: string) => void;
/**
 * Generate output filename with timestamp
 */
export declare const generateOutputFilename: (format: "csv" | "xlsx") => string;
/**
 * Display results to console/terminal with colors
 *
 * @param results - Array of processed results
 * @param targetDomain - Domain to highlight
 * @param debugMode - Show all 4 variants (default: false)
 */
export declare const displayResultsToConsole: (results: ProcessedResult[], targetDomain: string, debugMode?: boolean) => void;
/**
 * Save results to file (CSV or Excel) in optional subdirectory
 */
export declare const saveResultsToFile: (results: ProcessedResult[], format: "csv" | "xlsx", outputDir?: string) => string;
