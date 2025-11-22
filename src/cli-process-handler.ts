/**
 * Process command handler for CLI
 */

import * as fs from 'fs';
import { loadConfig } from './config';
import { readExcelFile } from './excel-reader';
import { VisibilityProcessor } from './processor';
import { ProcessingStats } from './types';
import { displayResultsToConsole } from './console-output';
import { saveResultsToFile } from './file-output';
import { setGlobalDebugMode } from './logger';
import { detectConfigFromQueries } from './config-detector';

interface ProcessOptions {
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
  forceConfigFromData?: boolean;
  debug?: boolean;
}

export const handleProcessCommand = async (
  inputFile: string,
  options: ProcessOptions
): Promise<void> => {
  // Enable debug mode if flag is set
  if (options.debug) {
    setGlobalDebugMode(true);
    console.log('🔍 DEBUG MODE ENABLED - All requests and responses will be logged\n');
  }

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

  // Auto-detect configuration if needed
  const hasEmptyValues = !config.TARGET_DOMAIN || !config.USER_LOCATION;
  const needsDetection = options.forceConfigFromData || hasEmptyValues;

  if (needsDetection) {
    config = await detectConfig(config, queries, options.forceConfigFromData || false);
  }

  // Skip lines if specified
  const skip = parseInt(options.skip || '0', 10);
  if (skip > 0) {
    queries = queries.slice(skip);
    console.log(`   ⏭️  Skipped first ${skip} queries`);
  }

  // Limit queries if specified
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

  // Display results and stats
  const stats = processor.getStats();
  displayStats(stats);
  displayResultsToConsole(results, config.TARGET_DOMAIN, options.debug);
  displaySummary(config.TARGET_DOMAIN, stats);

  // Save to file if requested
  if (options.outputDir) {
    const format = options.format === 'xlsx' ? 'xlsx' : 'csv';
    console.log('💾 Saving results to file...');
    const savedPath = saveResultsToFile(results, format, options.outputDir);
    console.log(`   ✅ Results saved to: ${savedPath}\n`);
  }

  console.log('✨ Done!\n');
};

const detectConfig = async (
  config: ReturnType<typeof loadConfig>,
  queries: ReturnType<typeof readExcelFile>,
  forceMode: boolean
) => {
  const detectionReason = forceMode
    ? 'Explicit --force-config-from-data flag (overriding ALL config values)'
    : 'Empty config values detected (auto-filling missing values only)';

  console.log('\n🤖 AI-Powered Config Detection...');
  console.log(`   Mode: ${detectionReason}`);
  console.log('   Analyzing sample queries to detect language, location, and domain...');

  try {
    const detected = await detectConfigFromQueries(
      queries,
      config.OPENAI_API_KEY,
      20
    );

    console.log('\n   ✅ Configuration detected:');
    console.log(`      Language: ${detected.language.toUpperCase()}`);
    console.log(`      Location: ${detected.location}`);
    if (detected.targetDomain) {
      console.log(`      Target Domain: ${detected.targetDomain}`);
    }
    console.log(`      Confidence: ${detected.confidence.toUpperCase()}\n`);

    // Apply detected values based on mode
    if (forceMode) {
      config.LANGUAGE = detected.language;
      config.USER_LOCATION = detected.location;
      if (detected.targetDomain) {
        config.TARGET_DOMAIN = detected.targetDomain;
      }
    } else {
      if (!config.LANGUAGE) config.LANGUAGE = detected.language;
      if (!config.USER_LOCATION) config.USER_LOCATION = detected.location;
      if (detected.targetDomain && !config.TARGET_DOMAIN) {
        config.TARGET_DOMAIN = detected.targetDomain;
      }
    }

    console.log('   📋 Final configuration:');
    console.log(`      Target Domain: ${config.TARGET_DOMAIN}`);
    console.log(`      User Location: ${config.USER_LOCATION}`);
    console.log(`      Language: ${config.LANGUAGE.toUpperCase()}\n`);
  } catch (error) {
    console.error('   ⚠️  Config detection failed:', error);
    console.log('   Continuing with current configuration...\n');
  }

  return config;
};

const displayStats = (stats: ProcessingStats) => {
  console.log('📊 Processing Statistics:');
  console.log(`   Total Queries: ${stats.total}`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   ✅ Visible: ${stats.visible}`);
  console.log(`   ⚠️  Tool Only: ${stats.toolOnly}`);
  console.log(`   ❌ Invisible: ${stats.invisible}`);
  console.log(`   ⛔ Errors: ${stats.errors}\n`);
};

const displaySummary = (
  targetDomain: string,
  stats: ProcessingStats
) => {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 VISIBILITY SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nTarget Domain: ${targetDomain}`);
  console.log(`Total Queries Processed: ${stats.processed}`);
  console.log(`\nVisibility Breakdown:`);
  console.log(`  ✅ Visible (in at least one variant): ${stats.visible}`);
  console.log(`  ⚠️  Tool-Only (only with web search): ${stats.toolOnly}`);
  console.log(`  ❌ Invisible (not found): ${stats.invisible}`);
  console.log(`  ⛔ Errors: ${stats.errors}`);

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
};
