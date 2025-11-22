/**
 * Query validation and detection utilities
 */

import { PROCESSING_CONSTANTS } from './constants';
import { isUrl } from './domain-utils';

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
