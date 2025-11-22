/**
 * Config loader - REUSES src/types.ts Config interface
 * 43 lines - compliant with ≤75 rule
 */

import { Config } from '../../src/types';
import { DEFAULT_PROMPTS } from '../generated/prompts';

export interface ConfigOverrides {
  TARGET_DOMAIN?: string;
  USER_LOCATION?: string;
  LANGUAGE?: string;
  MODEL_OPENAI?: string;
  MODEL_GEMINI?: string;
}

export const loadConfig = (
  apiKeys: { OPENAI_API_KEY: string; GEMINI_API_KEY: string },
  overrides?: ConfigOverrides
): Config => {
  if (!apiKeys.OPENAI_API_KEY || !apiKeys.GEMINI_API_KEY) {
    throw new Error('Both API keys required (BYOK)');
  }
  return {
    OPENAI_API_KEY: apiKeys.OPENAI_API_KEY,
    GEMINI_API_KEY: apiKeys.GEMINI_API_KEY,
    TARGET_DOMAIN: overrides?.TARGET_DOMAIN || '',
    USER_LOCATION: overrides?.USER_LOCATION || '',
    LANGUAGE: overrides?.LANGUAGE || 'en',
    MODEL_OPENAI: overrides?.MODEL_OPENAI || 'gpt-5-mini',
    MODEL_GEMINI: overrides?.MODEL_GEMINI || 'gemini-2.5-flash',
    PROMPTS: {
      OPENAI_PERSONA_SYSTEM: DEFAULT_PROMPTS.persona_system || '',
      OPENAI_SEARCH_NO_TOOLS_SYSTEM: DEFAULT_PROMPTS.search_openai_no_tools_system || '',
      OPENAI_SEARCH_NO_TOOLS_USER: DEFAULT_PROMPTS.search_openai_no_tools_user || '',
      OPENAI_SEARCH_WITH_TOOLS_SYSTEM: DEFAULT_PROMPTS.search_openai_with_tools_system || '',
      OPENAI_SEARCH_WITH_TOOLS_USER: DEFAULT_PROMPTS.search_openai_with_tools_user || '',
      GEMINI_SEARCH_NO_GROUNDING: DEFAULT_PROMPTS.search_gemini_no_grounding || '',
      GEMINI_SEARCH_WITH_GROUNDING: DEFAULT_PROMPTS.search_gemini_with_grounding || '',
    },
  };
};

export const validateConfig = (cfg: Config): void => {
  if (!cfg.OPENAI_API_KEY || !cfg.GEMINI_API_KEY) throw new Error('Missing API keys');
};
