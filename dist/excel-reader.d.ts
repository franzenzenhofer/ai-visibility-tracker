/**
 * Excel file reader for GSC exports
 * Auto-detects correct sheet and column regardless of language
 */
import { QueryRow } from './types';
export declare const readExcelFile: (filePath: string) => QueryRow[];
