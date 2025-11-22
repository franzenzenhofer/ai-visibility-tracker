/**
 * Config command handler for CLI
 */

import { loadConfig } from './config';

export const handleConfigCommand = (): void => {
  const config = loadConfig();
  console.log('\n📋 Current Configuration:\n');
  console.log(`   OPENAI_API_KEY: ${config.OPENAI_API_KEY ? '✓ Set' : '✗ Not set'}`);
  console.log(`   GEMINI_API_KEY: ${config.GEMINI_API_KEY ? '✓ Set' : '✗ Not set'}`);
  console.log(`   TARGET_DOMAIN: ${config.TARGET_DOMAIN}`);
  console.log(`   USER_LOCATION: ${config.USER_LOCATION}`);
  console.log(`   LANGUAGE: ${config.LANGUAGE.toUpperCase()}`);
  console.log(`   MODEL_OPENAI: ${config.MODEL_OPENAI}`);
  console.log(`   MODEL_GEMINI: ${config.MODEL_GEMINI}\n`);
};
