/**
 * Application constants
 * Centralized location for all magic numbers and strings
 */

/**
 * Processing configuration constants
 */
export const PROCESSING_CONSTANTS = {
  /** Rate limiting delay between API calls (milliseconds) */
  RATE_LIMIT_DELAY_MS: 500,

  /** Maximum concurrent API calls in queue */
  QUEUE_CONCURRENCY: 3,

  /** Number of samples to check for query column detection */
  QUERY_DETECTION_SAMPLE_SIZE: 10,

  /** Threshold for query column detection (70%) */
  QUERY_DETECTION_THRESHOLD: 0.7,

  /** Minimum query length in characters */
  QUERY_MIN_LENGTH: 2,

  /** Maximum query length in characters */
  QUERY_MAX_LENGTH: 200,

  /** Maximum number of SERP results to extract */
  MAX_SERP_RESULTS: 5,
} as const;

/**
 * Status values for processed results
 */
export const RESULT_STATUS = {
  VISIBLE: 'visible',
  INVISIBLE: 'invisible',
  TOOL_ONLY: 'tool-only',
  ERROR: 'error',
} as const;

export type ResultStatus = typeof RESULT_STATUS[keyof typeof RESULT_STATUS];

/**
 * Location configuration
 */
export const LOCATION_CONFIG = {
  /** Default country code for OpenAI location */
  DEFAULT_COUNTRY_CODE: 'AT',
} as const;

/**
 * Temperature settings for AI models
 */
export const MODEL_TEMPERATURE = {
  /** Low temperature for more deterministic responses */
  LOW: 0.2,
} as const;

/**
 * Output column headers
 */
export const OUTPUT_HEADERS = [
  'Original Query',
  'Persona Prompt',
  'Status',
  'GPT Rank',
  'GPT URL',
  'GPT Rank (Web)',
  'GPT URL (Web)',
  'Gemini Rank',
  'Gemini URL',
  'Gemini Rank (Web)',
  'Gemini URL (Web)',
] as const;

/**
 * Placeholder tokens used in prompts
 */
export const PROMPT_PLACEHOLDERS = {
  LOCATION: '{location}',
  QUERY: '{query}',
} as const;

/**
 * Common domain prefixes to normalize
 */
export const DOMAIN_PREFIXES_TO_REMOVE = ['www.'] as const;

/**
 * URL protocols to identify
 */
export const URL_PROTOCOLS = ['http', 'www.'] as const;

/**
 * Google Search Console header variations (multilingual)
 */
export const GSC_HEADERS = [
  'Top queries',
  'Query',
  'Suchanfrage',
  'Keyword',
  'Search term',
] as const;
