/**
 * SERP result parsing utilities
 */

import { SerpResult } from './types';
import { normalizeDomain, extractDomainFromUrl } from './domain-utils';

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
