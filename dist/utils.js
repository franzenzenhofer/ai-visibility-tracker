"use strict";
/**
 * Shared utility functions
 * Eliminates code duplication across API clients and processors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQueryLike = exports.sleep = exports.extractGeminiGroundingUrls = exports.parseSerpJson = exports.isUrl = exports.extractDomainFromUrl = exports.normalizeDomain = exports.replacePromptPlaceholders = void 0;
const constants_1 = require("./constants");
/**
 * Replace placeholder tokens in prompt templates
 *
 * @param prompt - Template string with placeholders
 * @param userLocation - User's location to replace {location}
 * @param query - Optional query to replace {query}
 * @returns Prompt with placeholders replaced
 */
const replacePromptPlaceholders = (prompt, userLocation, query) => {
    return prompt
        .replace(new RegExp(constants_1.PROMPT_PLACEHOLDERS.LOCATION, 'g'), userLocation)
        .replace(new RegExp(constants_1.PROMPT_PLACEHOLDERS.QUERY, 'g'), query || '');
};
exports.replacePromptPlaceholders = replacePromptPlaceholders;
/**
 * Normalize domain name by removing common prefixes
 *
 * @param domain - Domain name to normalize
 * @returns Normalized domain in lowercase without www prefix
 */
const normalizeDomain = (domain) => {
    let normalized = domain.toLowerCase();
    for (const prefix of constants_1.DOMAIN_PREFIXES_TO_REMOVE) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.substring(prefix.length);
        }
    }
    return normalized;
};
exports.normalizeDomain = normalizeDomain;
/**
 * Extract domain from URL
 *
 * @param url - Full URL string
 * @returns Normalized domain name or empty string if invalid
 */
const extractDomainFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return (0, exports.normalizeDomain)(urlObj.hostname);
    }
    catch {
        return '';
    }
};
exports.extractDomainFromUrl = extractDomainFromUrl;
/**
 * Check if a string is a valid URL
 *
 * @param value - String to check
 * @returns True if the string appears to be a URL
 */
const isUrl = (value) => {
    return constants_1.URL_PROTOCOLS.some(protocol => value.startsWith(protocol));
};
exports.isUrl = isUrl;
/**
 * Parse SERP-like JSON from AI response text
 * Handles multiple formats: url/link/href fields
 *
 * @param text - Response text containing JSON array
 * @returns Array of SERP results or null if parsing fails
 */
const parseSerpJson = (text) => {
    try {
        // Extract JSON array from text (matches [{...}, {...}] pattern)
        const match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (!match) {
            return null;
        }
        const arr = JSON.parse(match[0]);
        if (!Array.isArray(arr)) {
            return null;
        }
        // Normalize and validate each item
        return arr.map(item => {
            const url = item.url || item.link || item.href || '';
            let domain = item.domain || '';
            // Extract domain from URL if not provided
            if (!domain && url) {
                domain = (0, exports.extractDomainFromUrl)(url);
            }
            // Normalize domain
            domain = (0, exports.normalizeDomain)(domain);
            return {
                rank: item.rank || 0,
                domain,
                url,
            };
        });
    }
    catch (error) {
        console.error('Failed to parse SERP JSON:', error);
        return null;
    }
};
exports.parseSerpJson = parseSerpJson;
/**
 * Extract URLs from Gemini grounding metadata
 * Gemini API includes actual search results in grounding metadata
 *
 * @param response - Gemini API response with grounding metadata
 * @returns Array of SERP results from grounding or null if not available
 */
const extractGeminiGroundingUrls = (response) => {
    try {
        const metadata = response.groundingMetadata || response.grounding_metadata;
        if (!metadata) {
            return null;
        }
        const chunks = metadata.groundingChunks ||
            metadata.grounding_chunks ||
            metadata.webSearchQueries ||
            [];
        if (!Array.isArray(chunks) || chunks.length === 0) {
            return null;
        }
        // Extract URLs from chunks (limit to configured max)
        const results = [];
        const maxResults = Math.min(constants_1.PROCESSING_CONSTANTS.MAX_SERP_RESULTS, chunks.length);
        for (let i = 0; i < maxResults; i++) {
            const chunk = chunks[i];
            const uri = chunk.uri || chunk.url || chunk.web?.uri || chunk.web?.url;
            // Skip redirect URLs from grounding API
            if (uri && !uri.includes('grounding-api-redirect')) {
                const domain = (0, exports.extractDomainFromUrl)(uri);
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
    }
    catch {
        return null;
    }
};
exports.extractGeminiGroundingUrls = extractGeminiGroundingUrls;
/**
 * Sleep for specified milliseconds
 * Utility for rate limiting and delays
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
/**
 * Check if value contains text suitable for a search query
 * Used for auto-detecting query columns in Excel files
 *
 * @param value - String value to check
 * @returns True if value looks like a search query
 */
const isQueryLike = (value) => {
    const trimmed = value.trim();
    // Query characteristics:
    // - Length within valid range
    // - Contains letters (including international characters)
    // - Not a URL
    const hasValidLength = trimmed.length >= constants_1.PROCESSING_CONSTANTS.QUERY_MIN_LENGTH &&
        trimmed.length <= constants_1.PROCESSING_CONSTANTS.QUERY_MAX_LENGTH;
    const hasLetters = /[a-zA-ZäöüßÄÖÜàáâãåèéêëìíîïòóôõùúûýÿčćđšžÀÁÂÃÅÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÝŸČĆĐŠŽ]/.test(trimmed);
    const notUrl = !(0, exports.isUrl)(trimmed);
    return hasValidLength && hasLetters && notUrl;
};
exports.isQueryLike = isQueryLike;
