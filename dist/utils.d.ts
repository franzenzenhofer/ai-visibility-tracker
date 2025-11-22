/**
 * Shared utility functions
 * Eliminates code duplication across API clients and processors
 */
import { SerpResult } from './types';
/**
 * Gemini API response structure for grounding metadata
 */
export interface GeminiGroundingChunk {
    uri?: string;
    url?: string;
    web?: {
        uri?: string;
        url?: string;
    };
}
export interface GeminiGroundingMetadata {
    groundingChunks?: GeminiGroundingChunk[];
    grounding_chunks?: GeminiGroundingChunk[];
    webSearchQueries?: GeminiGroundingChunk[];
}
export interface GeminiResponseWithGrounding {
    groundingMetadata?: GeminiGroundingMetadata;
    grounding_metadata?: GeminiGroundingMetadata;
}
/**
 * Replace placeholder tokens in prompt templates
 *
 * @param prompt - Template string with placeholders
 * @param userLocation - User's location to replace {location}
 * @param query - Optional query to replace {query}
 * @returns Prompt with placeholders replaced
 */
export declare const replacePromptPlaceholders: (prompt: string, userLocation: string, query?: string) => string;
/**
 * Normalize domain name by removing common prefixes
 *
 * @param domain - Domain name to normalize
 * @returns Normalized domain in lowercase without www prefix
 */
export declare const normalizeDomain: (domain: string) => string;
/**
 * Extract domain from URL
 *
 * @param url - Full URL string
 * @returns Normalized domain name or empty string if invalid
 */
export declare const extractDomainFromUrl: (url: string) => string;
/**
 * Check if a string is a valid URL
 *
 * @param value - String to check
 * @returns True if the string appears to be a URL
 */
export declare const isUrl: (value: string) => boolean;
/**
 * Parse SERP-like JSON from AI response text
 * Handles multiple formats: url/link/href fields
 *
 * @param text - Response text containing JSON array
 * @returns Array of SERP results or null if parsing fails
 */
export declare const parseSerpJson: (text: string) => SerpResult[] | null;
/**
 * Extract URLs from Gemini grounding metadata
 * Gemini API includes actual search results in grounding metadata
 *
 * @param response - Gemini API response with grounding metadata
 * @returns Array of SERP results from grounding or null if not available
 */
export declare const extractGeminiGroundingUrls: (response: GeminiResponseWithGrounding) => SerpResult[] | null;
/**
 * Sleep for specified milliseconds
 * Utility for rate limiting and delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export declare const sleep: (ms: number) => Promise<void>;
/**
 * Check if value contains text suitable for a search query
 * Used for auto-detecting query columns in Excel files
 *
 * @param value - String value to check
 * @returns True if value looks like a search query
 */
export declare const isQueryLike: (value: string) => boolean;
