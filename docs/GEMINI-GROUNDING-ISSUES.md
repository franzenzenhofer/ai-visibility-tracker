# Gemini Grounding API Issues - Root Cause Analysis

**Date:** 2025-11-22
**Analyzed By:** Claude Code

## Problem Summary

Gemini With Grounding (Google Search) results sometimes show "-" for rank in the web interface despite URLs being present in the logs.

## Root Causes Identified

### Issue 1: API Timeouts (HTTP 524)

**Example:** Query "stadtplan wien" (2025-11-22 23:33:48)

**Timeline:**
- API request started: 23:33:48.557
- Error response received: 23:35:53.668
- **Duration: 125 seconds (2+ minutes)**

**Error:**
```
[GoogleGenerativeAI Error]: Error fetching from
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [524]
```

**524 = Cloudflare Gateway Timeout** - The Gemini API took too long to respond and Cloudflare killed the connection.

**Code Flow:**
1. Gemini WithGrounding API times out after 125 seconds
2. Error caught in `src/gemini-queries.ts:161` → returns `null`
3. `workers/utils/api-caller.ts:24` converts `null` to `defaultValue: []` (empty array)
4. Empty array passed to `findRank()` → no results to search
5. Returns `{ rank: '-', url: '-' }`

**Result:** Both rank AND URLs show "-" in table

---

### Issue 2: Redirect URLs Don't Match Target Domain

**Example:** Query "feiertage österreich 2025" (2025-11-22 23:36:05)

**API Response (successful, 4233ms):**
```json
[
  {
    "rank": 1,
    "domain": "urlaubsguru.at",
    "url": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEaKWNMVg5ftktmyOUMGq09iR5l4KDGztjn26CvO1U_TUXNNgNE8Ra64nIN5yRvEHaT6O1RwWHz9lOYGlRBnzZKrBqDy7UbwNSrnGlZaz-Z75JgZn6YmIs6FPVPBjRfoZsERHtD8wB4A-ZMvG5olh=="
  },
  {
    "rank": 2,
    "domain": "bluesunhotels.com",
    "url": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG76OK_i6n94JfFB-j7i9MabkSzfGGttLLzNVCcd2UfUkj7fsnU07xoph-4k54VwM-WFBDdfhsAKdQym_hQ1wCrGKSBTErZfmXn-v76iMu01bhFqrc_uxr24XoRz8iNU06QSQmQy9nF0M4GyW41pBOvK3K48VVWMovPz6IxAA=="
  }
  // ... 3 more results
]
```

**The Problem:** Gemini's grounding API returns **temporary redirect URLs** instead of real destination URLs.

**Code Flow:**
1. `extractGeminiGroundingUrls()` (`src/gemini-utils.ts:70`) filters OUT redirect URLs:
   ```typescript
   // Skip redirect URLs from grounding API
   if (uri && !uri.includes('grounding-api-redirect')) {
   ```

2. Falls back to `parseSerpJson(text)` which DOES parse the redirect URLs

3. 5 results returned with redirect URLs like:
   ```
   https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ...
   ```

4. `findRank()` tries to match against target domain `wien.gv.at`:
   ```typescript
   const d = normalizeDomain(extractDomainFromUrl(r.url));
   return d.includes(targetDomain) || targetDomain.includes(d);
   ```

5. `vertexaisearch.cloud.google.com` doesn't match `wien.gv.at` → **NO MATCH**

6. Returns `{ rank: '-', url: '-' }`

**Result:** URLs ARE stored and displayed in table, but rank shows "-" because redirect domain doesn't match target domain.

---

## Files Involved

| File | Lines | Issue |
|------|-------|-------|
| `src/gemini-utils.ts` | 70 | Filters out redirect URLs from grounding metadata |
| `src/gemini-queries.ts` | 151-159 | Grounding URL extraction with text fallback |
| `workers/utils/ranking.ts` | 9-14 | Domain matching logic that fails with redirect URLs |
| `workers/utils/api-caller.ts` | 24 | Converts null errors to empty arrays |

---

## Potential Solutions (NOT YET IMPLEMENTED)

### For Issue 1: Timeouts
- Increase timeout threshold (but Cloudflare has hard limits)
- Retry failed queries with exponential backoff
- Use shorter prompts for Gemini grounding queries
- Consider switching to Gemini Pro with better performance

### For Issue 2: Redirect URLs
**Option A:** Follow redirects to get real URLs
- Fetch redirect URL and extract final destination
- Performance cost: additional HTTP requests per result
- May hit CORS issues in browser

**Option B:** Extract destination domain from redirect params
- Parse redirect URL query parameters
- Look for destination domain hints in the base64-encoded token
- Fragile: depends on Google's redirect URL structure

**Option C:** Use grounding metadata instead of JSON response
- Rely on `groundingMetadata.groundingChunks[].uri` field
- May contain real URLs before redirect wrapping
- Currently filtered out (line 70 in gemini-utils.ts)

**Option D:** Accept redirect URLs, match by domain field
- Use the `domain` field from JSON (e.g., "urlaubsguru.at")
- Ignore the redirect URL for matching purposes
- Simple fix: `findRank()` could check both `r.domain` and extracted domain from URL

---

## Current Workaround

**The code intentionally filters out redirect URLs** in `src/gemini-utils.ts:70`:
```typescript
// Skip redirect URLs from grounding API
if (uri && !uri.includes('grounding-api-redirect')) {
```

This prevents redirect URLs from appearing in results when extracted from grounding metadata. However, the fallback `parseSerpJson()` still captures them from the JSON text response, leading to the mismatch issue.

---

## Recommendations

1. **Short-term:** Document this as a known limitation of Gemini grounding
2. **Medium-term:** Implement Option D (match by domain field) - simplest fix
3. **Long-term:** Monitor Google's Vertex AI Search API for changes to redirect behavior
4. **Consider:** Switch to a more reliable grounding solution or accept grounding limitations

---

**Last Updated:** 2025-11-22
**Status:** Issue documented, no fix implemented yet
