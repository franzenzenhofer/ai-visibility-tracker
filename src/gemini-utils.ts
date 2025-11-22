/**
 * Gemini API-specific utilities for grounding metadata extraction
 */

import { SerpResult } from './types';
import { extractDomainFromUrl } from './domain-utils';
import { PROCESSING_CONSTANTS } from './constants';

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
