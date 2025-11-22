"use strict";
/**
 * Excel file reader for GSC exports
 * Auto-detects correct sheet and column regardless of language
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readExcelFile = void 0;
const XLSX = __importStar(require("xlsx"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
/**
 * Check if a column contains query-like data
 *
 * @param data - Array of row data
 * @param columnName - Column name to check
 * @returns True if column appears to contain search queries
 */
const isQueryColumn = (data, columnName) => {
    const samplesToCheck = Math.min(constants_1.PROCESSING_CONSTANTS.QUERY_DETECTION_SAMPLE_SIZE, data.length);
    let queryLikeCount = 0;
    for (let i = 0; i < samplesToCheck; i++) {
        const value = String(data[i][columnName] || '').trim();
        if ((0, utils_1.isQueryLike)(value)) {
            queryLikeCount++;
        }
    }
    // If more than threshold of samples look like queries, it's the query column
    return (queryLikeCount / samplesToCheck >
        constants_1.PROCESSING_CONSTANTS.QUERY_DETECTION_THRESHOLD);
};
/**
 * Find the sheet containing GSC data
 */
const findGSCSheet = (workbook) => {
    // Try each sheet
    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (data.length === 0)
            continue;
        const headers = Object.keys(data[0]).map(h => h.toLowerCase());
        // Check if this sheet has GSC-like headers
        const hasGSCHeaders = config_1.GSC_HEADERS.some(gscHeader => headers.some(h => h.includes(gscHeader.toLowerCase()) || gscHeader.toLowerCase().includes(h)));
        // Also check for common GSC columns: clicks, impressions, ctr, position
        const hasMetrics = ['clicks', 'impressions', 'ctr', 'position'].some(metric => headers.some(h => h.includes(metric.toLowerCase())));
        if (hasGSCHeaders || hasMetrics) {
            return sheetName;
        }
    }
    return null;
};
/**
 * Find the query column in the data
 */
const findQueryColumn = (data) => {
    const headers = Object.keys(data[0]);
    // Method 1: Try exact or partial matches with known GSC headers
    for (const header of headers) {
        const headerLower = header.toLowerCase().trim();
        for (const gscHeader of config_1.GSC_HEADERS) {
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
const readExcelFile = (filePath) => {
    try {
        const workbook = XLSX.readFile(filePath);
        // Find the correct sheet (auto-detect)
        let sheetName = findGSCSheet(workbook);
        if (!sheetName) {
            // Fallback to first sheet
            sheetName = workbook.SheetNames[0];
            console.log(`⚠️  Could not detect GSC sheet, using first sheet: "${sheetName}"`);
        }
        else {
            console.log(`✅ Detected GSC sheet: "${sheetName}"`);
        }
        const worksheet = workbook.Sheets[sheetName];
        // Convert to JSON with header row
        const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        if (data.length === 0) {
            throw new Error(`Sheet "${sheetName}" is empty`);
        }
        // Find query column (auto-detect)
        const queryColumn = findQueryColumn(data);
        if (!queryColumn) {
            const headers = Object.keys(data[0]);
            throw new Error(`Could not detect query column. Available columns: ${headers.join(', ')}\n` +
                `Expected patterns: ${config_1.GSC_HEADERS.join(', ')}`);
        }
        console.log(`✅ Using query column: "${queryColumn}"`);
        // Extract queries
        const queries = [];
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
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to read Excel file: ${error.message}`);
        }
        throw error;
    }
};
exports.readExcelFile = readExcelFile;
