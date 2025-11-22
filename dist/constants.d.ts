/**
 * Application constants
 * Centralized location for all magic numbers and strings
 */
/**
 * Processing configuration constants
 */
export declare const PROCESSING_CONSTANTS: {
    /** Rate limiting delay between API calls (milliseconds) */
    readonly RATE_LIMIT_DELAY_MS: 500;
    /** Maximum concurrent API calls in queue */
    readonly QUEUE_CONCURRENCY: 3;
    /** Number of samples to check for query column detection */
    readonly QUERY_DETECTION_SAMPLE_SIZE: 10;
    /** Threshold for query column detection (70%) */
    readonly QUERY_DETECTION_THRESHOLD: 0.7;
    /** Minimum query length in characters */
    readonly QUERY_MIN_LENGTH: 2;
    /** Maximum query length in characters */
    readonly QUERY_MAX_LENGTH: 200;
    /** Maximum number of SERP results to extract */
    readonly MAX_SERP_RESULTS: 5;
};
/**
 * Status values for processed results
 */
export declare const RESULT_STATUS: {
    readonly VISIBLE: "visible";
    readonly INVISIBLE: "invisible";
    readonly TOOL_ONLY: "tool-only";
    readonly ERROR: "error";
};
export type ResultStatus = typeof RESULT_STATUS[keyof typeof RESULT_STATUS];
/**
 * Location configuration
 */
export declare const LOCATION_CONFIG: {
    /** Default country code for OpenAI location */
    readonly DEFAULT_COUNTRY_CODE: "AT";
};
/**
 * Temperature settings for AI models
 */
export declare const MODEL_TEMPERATURE: {
    /** Low temperature for more deterministic responses */
    readonly LOW: 0.2;
};
/**
 * Output column headers
 */
export declare const OUTPUT_HEADERS: readonly ["Original Query", "Persona Prompt", "Status", "GPT Rank", "GPT URL", "GPT Rank (Web)", "GPT URL (Web)", "Gemini Rank", "Gemini URL", "Gemini Rank (Web)", "Gemini URL (Web)"];
/**
 * Placeholder tokens used in prompts
 */
export declare const PROMPT_PLACEHOLDERS: {
    readonly LOCATION: "{location}";
    readonly QUERY: "{query}";
};
/**
 * Common domain prefixes to normalize
 */
export declare const DOMAIN_PREFIXES_TO_REMOVE: readonly ["www."];
/**
 * URL protocols to identify
 */
export declare const URL_PROTOCOLS: readonly ["http", "www."];
/**
 * Google Search Console header variations (multilingual)
 */
export declare const GSC_HEADERS: readonly ["Top queries", "Query", "Suchanfrage", "Keyword", "Search term"];
