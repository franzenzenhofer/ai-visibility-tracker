/**
 * Configuration management
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';
import { Config } from './types';

dotenv.config();

export const GSC_HEADERS = [
  'Top queries',
  'Query',
  'Suchanfrage',
  'Keyword',
  'Search term',
];

/**
 * Load configuration from TOML file and .env
 */
export const loadConfig = (): Config => {
  // Load API keys from .env
  const apiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in .env file');
  }

  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY is not set in .env file');
  }

  // Load other settings from TOML config file
  const configPath = path.join(process.cwd(), 'geo-visibility-config.toml');

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}\nPlease create geo-visibility-config.toml in the project root.`);
  }

  const configFile = fs.readFileSync(configPath, 'utf-8');
  const tomlConfig = toml.parse(configFile) as {
    target_domain?: string;
    user_location?: string;
    language?: string;
    batch_size?: number;
    model_openai?: string;
    model_gemini?: string;
    prompts?: {
      persona_system?: string;
      search_openai_no_tools_system?: string;
      search_openai_no_tools_user?: string;
      search_openai_with_tools_system?: string;
      search_openai_with_tools_user?: string;
      search_gemini_no_grounding?: string;
      search_gemini_with_grounding?: string;
    };
  };

  // Extract prompts
  const prompts = tomlConfig.prompts || {};

  // For target_domain and user_location: preserve empty strings from config
  // (they trigger auto-detection in CLI)
  // For language: default to 'en' if empty or undefined
  const targetDomain = tomlConfig.target_domain !== undefined
    ? tomlConfig.target_domain.toLowerCase()
    : '';
  const userLocation = tomlConfig.user_location !== undefined
    ? tomlConfig.user_location
    : '';
  const language = tomlConfig.language || 'en';

  return {
    OPENAI_API_KEY: apiKey,
    GEMINI_API_KEY: geminiKey,
    TARGET_DOMAIN: targetDomain,
    USER_LOCATION: userLocation,
    LANGUAGE: language,
    MODEL_OPENAI: tomlConfig.model_openai || 'gpt-5-mini',
    MODEL_GEMINI: tomlConfig.model_gemini || 'gemini-2.5-flash',
    PROMPTS: {
      OPENAI_PERSONA_SYSTEM: prompts.persona_system || '',
      OPENAI_SEARCH_NO_TOOLS_SYSTEM: prompts.search_openai_no_tools_system || '',
      OPENAI_SEARCH_NO_TOOLS_USER: prompts.search_openai_no_tools_user || '',
      OPENAI_SEARCH_WITH_TOOLS_SYSTEM: prompts.search_openai_with_tools_system || '',
      OPENAI_SEARCH_WITH_TOOLS_USER: prompts.search_openai_with_tools_user || '',
      GEMINI_SEARCH_NO_GROUNDING: prompts.search_gemini_no_grounding || '',
      GEMINI_SEARCH_WITH_GROUNDING: prompts.search_gemini_with_grounding || '',
    },
  };
};
