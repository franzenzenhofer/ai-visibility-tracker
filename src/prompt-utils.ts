/**
 * Prompt template utilities
 */

import { PROMPT_PLACEHOLDERS } from './constants';

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
 * Sleep for specified milliseconds
 * Utility for rate limiting and delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
