#!/usr/bin/env node
"use strict";
/**
 * CLI for AI Visibility Tracker
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const cli_process_handler_1 = require("./cli-process-handler");
const cli_config_handler_1 = require("./cli-config-handler");
const program = new commander_1.Command();
program
    .name('geo-visibility')
    .description('AI Visibility Tracker - Track domain visibility across GPT & Gemini')
    .version('1.0.0');
program
    .command('process')
    .description('Process queries from Excel file')
    .argument('<input-file>', 'Input Excel file path')
    .option('-o, --output-dir <directory>', 'Save results to directory (optional, default: console output only)')
    .option('-f, --format <format>', 'Output format: csv or xlsx (default: csv)', 'csv')
    .option('-d, --domain <domain>', 'Target domain to track (overrides .env)')
    .option('-l, --location <location>', 'User location (overrides .env)')
    .option('--language <lang>', 'Language for persona prompts (ISO 639-1 code: en, de, es, fr, etc.)')
    .option('--skip <lines>', 'Skip first N lines from Excel file', '0')
    .option('--count <number>', 'Number of queries to process (default: 3)', '3')
    .option('-n, --limit <count>', 'DEPRECATED: Use --count instead', '0')
    .option('--model-openai <model>', 'OpenAI model to use (overrides .env)')
    .option('--model-gemini <model>', 'Gemini model to use (overrides .env)')
    .option('--force-config-from-data', 'Auto-detect language, location, and domain from sample queries using AI', false)
    .option('--debug', 'Enable debug mode (show all requests and responses)', false)
    .action(async (inputFile, options) => {
    try {
        await (0, cli_process_handler_1.handleProcessCommand)(inputFile, options);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`\n❌ Error: ${error.message}\n`);
        }
        else {
            console.error('\n❌ Unknown error occurred\n');
        }
        process.exit(1);
    }
});
program
    .command('config')
    .description('Show current configuration')
    .action(() => {
    try {
        (0, cli_config_handler_1.handleConfigCommand)();
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`\n❌ Error: ${error.message}\n`);
        }
        process.exit(1);
    }
});
program.parse();
