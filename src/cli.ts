#!/usr/bin/env node
/**
 * CLI for AI Visibility Tracker
 */

import { Command } from 'commander';
import * as fs from 'fs';
import { loadConfig } from './config';
import { readExcelFile } from './excel-reader';
import { VisibilityProcessor } from './processor';
import {
  displayResultsToConsole,
  saveResultsToFile,
} from './output-writer';
import { setGlobalDebugMode } from './logger';

const program = new Command();

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
  .option('--debug', 'Enable debug mode (show all requests and responses)', false)
  .action(async (inputFile: string, options: {
    outputDir?: string;
    format?: string;
    domain?: string;
    location?: string;
    language?: string;
    skip?: string;
    count?: string;
    limit?: string;
    modelOpenai?: string;
    modelGemini?: string;
    debug?: boolean;
  }) => {
    // Enable debug mode if flag is set
    if (options.debug) {
      setGlobalDebugMode(true);
      console.log('🔍 DEBUG MODE ENABLED - All requests and responses will be logged\n');
    }
    try {
      console.log('🚀 AI Visibility Tracker\n');

      // Validate input file
      if (!fs.existsSync(inputFile)) {
        console.error(`❌ Error: Input file not found: ${inputFile}`);
        process.exit(1);
      }

      // Load configuration
      console.log('📋 Loading configuration...');
      let config = loadConfig();

      // Override config with CLI options
      if (options.domain) {
        config.TARGET_DOMAIN = options.domain.toLowerCase();
      }
      if (options.location) {
        config.USER_LOCATION = options.location;
      }
      if (options.language) {
        config.LANGUAGE = options.language.toLowerCase();
      }
      if (options.modelOpenai) {
        config.MODEL_OPENAI = options.modelOpenai;
      }
      if (options.modelGemini) {
        config.MODEL_GEMINI = options.modelGemini;
      }

      console.log(`   Target Domain: ${config.TARGET_DOMAIN}`);
      console.log(`   User Location: ${config.USER_LOCATION}`);
      console.log(`   Language: ${config.LANGUAGE.toUpperCase()}`);
      console.log(`   OpenAI Model: ${config.MODEL_OPENAI}`);
      console.log(`   Gemini Model: ${config.MODEL_GEMINI}\n`);

      // Read Excel file
      console.log('📖 Reading Excel file...');
      let queries = readExcelFile(inputFile);
      console.log(`   Found ${queries.length} queries`);

      // Skip lines if specified
      const skip = parseInt(options.skip || '0', 10);
      if (skip > 0) {
        queries = queries.slice(skip);
        console.log(`   ⏭️  Skipped first ${skip} queries`);
      }

      // Limit queries if specified (use --count, fallback to deprecated -n)
      const count = parseInt(options.count || options.limit || '3', 10);
      if (count > 0 && queries.length > count) {
        queries = queries.slice(0, count);
        console.log(`   📊 Processing ${count} queries\n`);
      } else {
        console.log(`   📊 Processing ${queries.length} queries\n`);
      }

      // Process queries
      console.log('🔄 Processing queries...\n');
      const processor = new VisibilityProcessor(config);

      const results = await processor.processQueries(
        queries,
        (current, total, query) => {
          const progress = ((current / total) * 100).toFixed(1);
          process.stdout.write(`   [${current}/${total}] (${progress}%) Processing: ${query}\r`);
        }
      );

      console.log('\n');

      // Get statistics
      const stats = processor.getStats();
      console.log('📊 Processing Statistics:');
      console.log(`   Total Queries: ${stats.total}`);
      console.log(`   Processed: ${stats.processed}`);
      console.log(`   ✅ Visible: ${stats.visible}`);
      console.log(`   ⚠️  Tool Only: ${stats.toolOnly}`);
      console.log(`   ❌ Invisible: ${stats.invisible}`);
      console.log(`   ⛔ Errors: ${stats.errors}\n`);

      // Display results to console (always)
      displayResultsToConsole(results, config.TARGET_DOMAIN, options.debug);

      // Display summary
      console.log('\n' + '═'.repeat(80));
      console.log('📊 VISIBILITY SUMMARY');
      console.log('═'.repeat(80));
      console.log(`\nTarget Domain: ${config.TARGET_DOMAIN}`);
      console.log(`Total Queries Processed: ${stats.processed}`);
      console.log(`\nVisibility Breakdown:`);
      console.log(`  ✅ Visible (in at least one variant): ${stats.visible}`);
      console.log(`  ⚠️  Tool-Only (only with web search): ${stats.toolOnly}`);
      console.log(`  ❌ Invisible (not found): ${stats.invisible}`);
      console.log(`  ⛔ Errors: ${stats.errors}`);

      // Calculate percentages
      if (stats.processed > 0) {
        const visiblePct = ((stats.visible / stats.processed) * 100).toFixed(1);
        const toolOnlyPct = ((stats.toolOnly / stats.processed) * 100).toFixed(1);
        const invisiblePct = ((stats.invisible / stats.processed) * 100).toFixed(1);

        console.log(`\nVisibility Rate: ${visiblePct}% (${stats.visible + stats.toolOnly}/${stats.processed})`);
        console.log(`Pure Model Visibility: ${visiblePct}% (${stats.visible}/${stats.processed})`);
        console.log(`Web Search Only: ${toolOnlyPct}% (${stats.toolOnly}/${stats.processed})`);
        console.log(`Not Found: ${invisiblePct}% (${stats.invisible}/${stats.processed})`);
      }

      console.log('\n' + '═'.repeat(80) + '\n');

      // Optionally save to file
      if (options.outputDir) {
        const format = options.format === 'xlsx' ? 'xlsx' : 'csv';
        console.log('💾 Saving results to file...');
        const savedPath = saveResultsToFile(results, format, options.outputDir);
        console.log(`   ✅ Results saved to: ${savedPath}\n`);
      }

      console.log('✨ Done!\n');
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n❌ Error: ${error.message}\n`);
      } else {
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
      const config = loadConfig();
      console.log('\n📋 Current Configuration:\n');
      console.log(`   OPENAI_API_KEY: ${config.OPENAI_API_KEY ? '✓ Set' : '✗ Not set'}`);
      console.log(`   GEMINI_API_KEY: ${config.GEMINI_API_KEY ? '✓ Set' : '✗ Not set'}`);
      console.log(`   TARGET_DOMAIN: ${config.TARGET_DOMAIN}`);
      console.log(`   USER_LOCATION: ${config.USER_LOCATION}`);
      console.log(`   LANGUAGE: ${config.LANGUAGE.toUpperCase()}`);
      console.log(`   MODEL_OPENAI: ${config.MODEL_OPENAI}`);
      console.log(`   MODEL_GEMINI: ${config.MODEL_GEMINI}\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

program.parse();
