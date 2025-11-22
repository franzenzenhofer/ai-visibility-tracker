/**
 * Domain name manipulation utilities
 */

import { DOMAIN_PREFIXES_TO_REMOVE, URL_PROTOCOLS } from './constants';

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
