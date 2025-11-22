/**
 * Shared utility functions
 * Eliminates code duplication across API clients and processors
 */

import { SerpResult } from './types';
import {
  PROMPT_PLACEHOLDERS,
  DOMAIN_PREFIXES_TO_REMOVE,
  URL_PROTOCOLS,
  PROCESSING_CONSTANTS,
} from './constants';

/**
 * JSON result from AI response that may contain SERP-like data
 */
interface ParsedJsonItem {
  rank?: number;
  domain?: string;
  url?: string;
  link?: string;
  href?: string;
}

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
export const replacePromptPlaceholders = (
  prompt: string,
  userLocation: string,
  query?: string
): string => {
  return prompt
    .replace(new RegExp(PROMPT_PLACEHOLDERS.LOCATION, 'g'), userLocation)
    .replace(new RegExp(PROMPT_PLACEHOLDERS.QUERY, 'g'), query || '');
};

/**
 * Normalize domain name by removing common prefixes
 *
 * @param domain - Domain name to normalize
 * @returns Normalized domain in lowercase without www prefix
 */
export const normalizeDomain = (domain: string): string => {
  let normalized = domain.toLowerCase();

  for (const prefix of DOMAIN_PREFIXES_TO_REMOVE) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
    }
  }

  return normalized;
};

/**
 * Extract domain from URL
 *
 * @param url - Full URL string
 * @returns Normalized domain name or empty string if invalid
 */
export const extractDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return normalizeDomain(urlObj.hostname);
  } catch {
    return '';
  }
};

/**
 * Check if a string is a valid URL
 *
 * @param value - String to check
 * @returns True if the string appears to be a URL
 */
export const isUrl = (value: string): boolean => {
  return URL_PROTOCOLS.some(protocol => value.startsWith(protocol));
};

/**
 * Parse SERP-like JSON from AI response text
 * Handles multiple formats: url/link/href fields
 *
 * @param text - Response text containing JSON array
 * @returns Array of SERP results or null if parsing fails
 */
export const parseSerpJson = (text: string): SerpResult[] | null => {
  try {
    // Extract JSON array from text (matches [{...}, {...}] pattern)
    const match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!match) {
      return null;
    }

    const arr = JSON.parse(match[0]) as ParsedJsonItem[];
    if (!Array.isArray(arr)) {
      return null;
    }

    // Normalize and validate each item
    return arr.map(item => {
      const url = item.url || item.link || item.href || '';
      let domain = item.domain || '';

      // Extract domain from URL if not provided
      if (!domain && url) {
        domain = extractDomainFromUrl(url);
      }

      // Normalize domain
      domain = normalizeDomain(domain);

      return {
        rank: item.rank || 0,
        domain,
        url,
      };
    });
  } catch (error) {
    console.error('Failed to parse SERP JSON:', error);
    return null;
  }
};

/**
 * Extract URLs from Gemini grounding metadata
 * Gemini API includes actual search results in grounding metadata
 *
 * @param response - Gemini API response with grounding metadata
 * @returns Array of SERP results from grounding or null if not available
 */
export const extractGeminiGroundingUrls = (
  response: GeminiResponseWithGrounding
): SerpResult[] | null => {
  try {
    const metadata = response.groundingMetadata || response.grounding_metadata;
    if (!metadata) {
      return null;
    }

    const chunks =
      metadata.groundingChunks ||
      metadata.grounding_chunks ||
      metadata.webSearchQueries ||
      [];

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return null;
    }

    // Extract URLs from chunks (limit to configured max)
    const results: SerpResult[] = [];
    const maxResults = Math.min(
      PROCESSING_CONSTANTS.MAX_SERP_RESULTS,
      chunks.length
    );

    for (let i = 0; i < maxResults; i++) {
      const chunk = chunks[i];
      const uri = chunk.uri || chunk.url || chunk.web?.uri || chunk.web?.url;

      // Skip redirect URLs from grounding API
      if (uri && !uri.includes('grounding-api-redirect')) {
        const domain = extractDomainFromUrl(uri);

        if (domain) {
          results.push({
            rank: i + 1,
            domain,
            url: uri,
          });
        }
      }
    }

    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
};

/**
 * Sleep for specified milliseconds
 * Utility for rate limiting and delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if value contains text suitable for a search query
 * Used for auto-detecting query columns in Excel files
 *
 * @param value - String value to check
 * @returns True if value looks like a search query
 */
export const isQueryLike = (value: string): boolean => {
  const trimmed = value.trim();

  // Query characteristics:
  // - Length within valid range
  // - Contains letters (including international characters)
  // - Not a URL
  const hasValidLength =
    trimmed.length >= PROCESSING_CONSTANTS.QUERY_MIN_LENGTH &&
    trimmed.length <= PROCESSING_CONSTANTS.QUERY_MAX_LENGTH;

  const hasLetters =
    /[a-zA-ZäöüßÄÖÜàáâãåèéêëìíîïòóôõùúûýÿčćđšžÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝŸČĆĐŠŽ]/.test(
      trimmed
    );

  const notUrl = !isUrl(trimmed);

  return hasValidLength && hasLetters && notUrl;
};
