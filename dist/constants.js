"use strict";
/**
 * Application constants
 * Centralized location for all magic numbers and strings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.URL_PROTOCOLS = exports.DOMAIN_PREFIXES_TO_REMOVE = exports.PROMPT_PLACEHOLDERS = exports.OUTPUT_HEADERS = exports.MODEL_TEMPERATURE = exports.LOCATION_CONFIG = exports.RESULT_STATUS = exports.PROCESSING_CONSTANTS = void 0;
/**
 * Processing configuration constants
 */
exports.PROCESSING_CONSTANTS = {
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
};
/**
 * Status values for processed results
 */
exports.RESULT_STATUS = {
    VISIBLE: 'visible',
    INVISIBLE: 'invisible',
    TOOL_ONLY: 'tool-only',
    ERROR: 'error',
};
/**
 * Location configuration
 */
exports.LOCATION_CONFIG = {
    /** Default country code for OpenAI location */
    DEFAULT_COUNTRY_CODE: 'AT',
};
/**
 * Temperature settings for AI models
 */
exports.MODEL_TEMPERATURE = {
    /** Low temperature for more deterministic responses */
    LOW: 0.2,
};
/**
 * Output column headers
 */
exports.OUTPUT_HEADERS = [
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
];
/**
 * Placeholder tokens used in prompts
 */
exports.PROMPT_PLACEHOLDERS = {
    LOCATION: '{location}',
    QUERY: '{query}',
};
/**
 * Common domain prefixes to normalize
 */
exports.DOMAIN_PREFIXES_TO_REMOVE = ['www.'];
/**
 * URL protocols to identify
 */
exports.URL_PROTOCOLS = ['http', 'www.'];
