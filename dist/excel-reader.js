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
const sheet_detector_1 = require("./sheet-detector");
const readExcelFile = (filePath) => {
    try {
        const workbook = XLSX.readFile(filePath);
        // Find the correct sheet (auto-detect)
        let sheetName = (0, sheet_detector_1.findGSCSheet)(workbook);
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
        const queryColumn = (0, sheet_detector_1.findQueryColumn)(data);
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
