/**
 * Type definitions for AI Visibility Tracker
 */

import { ResultStatus } from './constants';

export interface Config {
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  TARGET_DOMAIN: string;
  USER_LOCATION: string;
  LANGUAGE: string;
  MODEL_OPENAI: string;
  MODEL_GEMINI: string;
  PROMPTS: {
    OPENAI_PERSONA_SYSTEM: string;
    OPENAI_SEARCH_NO_TOOLS_SYSTEM: string;
    OPENAI_SEARCH_NO_TOOLS_USER: string;
    OPENAI_SEARCH_WITH_TOOLS_SYSTEM: string;
    OPENAI_SEARCH_WITH_TOOLS_USER: string;
    GEMINI_SEARCH_NO_GROUNDING: string;
    GEMINI_SEARCH_WITH_GROUNDING: string;
  };
}

export interface QueryRow {
  query: string;
  rowIndex: number;
  originalRow: Record<string, unknown>;
}

export interface ProcessedResult {
  originalQuery: string;
  personaPrompt: string;
  status: ResultStatus;
  // Store all results from each variant
  gptNoToolResults: SerpResult[];
  gptWithToolResults: SerpResult[];
  gemNoGroundingResults: SerpResult[];
  gemWithGroundingResults: SerpResult[];
  // Legacy fields for backward compatibility in CSV (matched domain only)
  gptRank: number | string;
  gptUrl: string;
  gptRankWeb: number | string;
  gptUrlWeb: string;
  gemRank: number | string;
  gemUrl: string;
  gemRankWeb: number | string;
  gemUrlWeb: string;
}

export interface SerpResult {
  rank: number;
  domain: string;
  url: string;
}

export interface ApiResponse {
  ok: boolean;
  code: number;
  text: string;
}

export interface ProcessingStats {
  total: number;
  processed: number;
  visible: number;
  invisible: number;
  toolOnly: number;
  errors: number;
}
