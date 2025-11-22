"use strict";
/**
 * Output writer for results
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveResultsToFile = exports.displayResultsToConsole = exports.generateOutputFilename = exports.writeResultsToExcel = exports.writeResultsToCSV = void 0;
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const constants_1 = require("./constants");
/**
 * Convert processed results to row array format
 *
 * @param results - Array of processed results
 * @returns Array of row arrays (header + data rows)
 */
const convertResultsToRows = (results) => {
    const rows = [[...constants_1.OUTPUT_HEADERS]];
    results.forEach(result => {
        rows.push([
            result.originalQuery,
            result.personaPrompt,
            result.status.toUpperCase(),
            String(result.gptRank),
            result.gptUrl,
            String(result.gptRankWeb),
            result.gptUrlWeb,
            String(result.gemRank),
            result.gemUrl,
            String(result.gemRankWeb),
            result.gemUrlWeb,
        ]);
    });
    return rows;
};
/**
 * Write results to CSV file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write CSV
 */
const writeResultsToCSV = (results, outputPath) => {
    const rows = convertResultsToRows(results);
    // Convert to CSV with quoted cells
    const csv = rows
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    fs.writeFileSync(outputPath, csv, 'utf-8');
};
exports.writeResultsToCSV = writeResultsToCSV;
/**
 * Write results to Excel file
 *
 * @param results - Array of processed results
 * @param outputPath - File path to write Excel
 */
const writeResultsToExcel = (results, outputPath) => {
    const rows = convertResultsToRows(results);
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, outputPath);
};
exports.writeResultsToExcel = writeResultsToExcel;
/**
 * Generate output filename with timestamp
 */
const generateOutputFilename = (format) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `results_${timestamp}.${format}`;
};
exports.generateOutputFilename = generateOutputFilename;
/**
 * Format SerpResult array for console output with colors
 *
 * @param results - Array of SERP results
 * @param targetDomain - Domain to highlight
 * @returns Formatted string with colors
 */
const formatSerpResults = (results, targetDomain) => {
    if (!results || results.length === 0) {
        return chalk_1.default.gray('  No results');
    }
    return results
        .map(r => {
        const isTarget = r.domain.includes(targetDomain) || r.url.includes(targetDomain);
        const rankStr = chalk_1.default.cyan(`  ${r.rank}.`);
        const domainStr = isTarget
            ? chalk_1.default.green.bold(r.domain)
            : chalk_1.default.white(r.domain);
        const urlStr = isTarget ? chalk_1.default.green(r.url) : chalk_1.default.gray(r.url);
        return `${rankStr} ${domainStr}\n     ${urlStr}`;
    })
        .join('\n');
};
/**
 * Get colored status text for display
 *
 * @param status - Result status
 * @returns Colored status string
 */
const getStatusText = (status) => {
    switch (status) {
        case constants_1.RESULT_STATUS.VISIBLE:
            return chalk_1.default.green.bold('✅ VISIBLE');
        case constants_1.RESULT_STATUS.TOOL_ONLY:
            return chalk_1.default.yellow.bold('⚠️  TOOL-ONLY');
        case constants_1.RESULT_STATUS.INVISIBLE:
            return chalk_1.default.red.bold('❌ INVISIBLE');
        case constants_1.RESULT_STATUS.ERROR:
            return chalk_1.default.red.bold('⛔ ERROR');
        default:
            return chalk_1.default.gray('UNKNOWN');
    }
};
/**
 * Display results to console/terminal with colors
 *
 * @param results - Array of processed results
 * @param targetDomain - Domain to highlight
 * @param debugMode - Show all 4 variants (default: false)
 */
const displayResultsToConsole = (results, targetDomain, debugMode = false) => {
    console.log('\n' + chalk_1.default.bold('═'.repeat(80)));
    console.log(chalk_1.default.bold.cyan('📊 AI VISIBILITY RESULTS'));
    console.log(chalk_1.default.bold('═'.repeat(80)) + '\n');
    results.forEach((result, index) => {
        // Header
        console.log(chalk_1.default.bold.yellow(`[${index + 1}] ${result.originalQuery}`));
        console.log(chalk_1.default.gray(`    Persona: "${result.personaPrompt}"`));
        // Status
        const statusText = getStatusText(result.status);
        console.log(`    Status: ${statusText}\n`);
        if (debugMode) {
            // DEBUG MODE: Show all 4 variants
            console.log(chalk_1.default.bold('  🤖 GPT (No Web Search):'));
            console.log(formatSerpResults(result.gptNoToolResults, targetDomain) + '\n');
            console.log(chalk_1.default.bold('  🌐 GPT (WITH Web Search):'));
            console.log(formatSerpResults(result.gptWithToolResults, targetDomain) + '\n');
            console.log(chalk_1.default.bold('  🧠 Gemini (No Grounding):'));
            console.log(formatSerpResults(result.gemNoGroundingResults, targetDomain) + '\n');
            console.log(chalk_1.default.bold('  🔍 Gemini (WITH Google Search):'));
            console.log(formatSerpResults(result.gemWithGroundingResults, targetDomain) + '\n');
        }
        else {
            // NORMAL MODE: Show summary of where domain was found
            const foundIn = [];
            if (result.gptRank !== '-') {
                foundIn.push(`GPT (rank ${result.gptRank})`);
            }
            if (result.gptRankWeb !== '-') {
                foundIn.push(`GPT+Web (rank ${result.gptRankWeb})`);
            }
            if (result.gemRank !== '-') {
                foundIn.push(`Gemini (rank ${result.gemRank})`);
            }
            if (result.gemRankWeb !== '-') {
                foundIn.push(`Gemini+Search (rank ${result.gemRankWeb})`);
            }
            if (foundIn.length > 0) {
                console.log(chalk_1.default.green(`  ✓ Found in: ${foundIn.join(', ')}`));
                // Show the best ranking URL
                const bestUrl = result.gptUrl !== '-' ? result.gptUrl :
                    result.gptUrlWeb !== '-' ? result.gptUrlWeb :
                        result.gemUrl !== '-' ? result.gemUrl : result.gemUrlWeb;
                console.log(chalk_1.default.gray(`  → ${bestUrl}`));
            }
            else {
                console.log(chalk_1.default.gray('  ✗ Not found in any variant'));
                console.log(chalk_1.default.gray('  → Use --debug to see all search results'));
            }
            console.log();
        }
        console.log(chalk_1.default.gray('─'.repeat(80)) + '\n');
    });
};
exports.displayResultsToConsole = displayResultsToConsole;
/**
 * Ensure output directory exists
 */
const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};
/**
 * Save results to file (CSV or Excel) in optional subdirectory
 */
const saveResultsToFile = (results, format, outputDir) => {
    const filename = (0, exports.generateOutputFilename)(format);
    const filepath = outputDir ? path.join(outputDir, filename) : filename;
    // Ensure directory exists
    if (outputDir) {
        ensureDirectory(outputDir);
    }
    // Write file
    if (format === 'csv') {
        (0, exports.writeResultsToCSV)(results, filepath);
    }
    else {
        (0, exports.writeResultsToExcel)(results, filepath);
    }
    return filepath;
};
exports.saveResultsToFile = saveResultsToFile;
