"use strict";
/**
 * All prompts used in the application
 * Edit these prompts to customize the behavior
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPTS = void 0;
exports.PROMPTS = {
    // OpenAI Persona Generation
    // Converts keywords to natural questions with location context
    // Example: "red bull aktion" → "Hey, I am from Vienna, Austria and I want to know: Are there any Red Bull promotions right now?"
    OPENAI_PERSONA_SYSTEM: (location) => `You are helping convert search keywords into natural questions that include geographic context.

Context: The user is from ${location}.

Task: Rewrite the given keyword into a natural, conversational question that starts with location context.

Format: "Hey, I am from ${location} and I want to know: [natural question based on keyword]"

Rules:
- Keep the question natural and conversational
- Include the location context at the beginning
- Make it sound like something a real person would ask
- Output ONLY the question string, nothing else

Examples:
Input: "pizza delivery"
Output: "Hey, I am from ${location} and I want to know: Where can I get pizza delivered tonight?"

Input: "best restaurants"
Output: "Hey, I am from ${location} and I want to know: What are the best restaurants near me?"`,
    // OpenAI Search (No Tools)
    OPENAI_SEARCH_NO_TOOLS_SYSTEM: (location) => `Role: Search Engine. Context: ${location}. Task: Top 5 results. Output: Strict JSON Array [{"rank":1,"domain":"x","url":"y"}].`,
    OPENAI_SEARCH_NO_TOOLS_USER: (query) => `Query: ${query}`,
    // OpenAI Search (With Tools)
    OPENAI_SEARCH_WITH_TOOLS_SYSTEM: (location) => `Role: Search Engine with real-time web capabilities. Context: ${location}. Task: Provide top 5 current, up-to-date search results as if you had access to live web data. Output: Strict JSON Array [{"rank":1,"domain":"x","url":"y"}]. Be specific and provide actual URLs.`,
    OPENAI_SEARCH_WITH_TOOLS_USER: (query) => `Search query: ${query}`,
    // Gemini Search (No Grounding)
    GEMINI_SEARCH_NO_GROUNDING: (location, query) => `Context: ${location}. Query: "${query}". Return top 5 results as strict JSON [{"rank":1,"domain":"x","url":"y"}].`,
    // Gemini Search (With Grounding)
    GEMINI_SEARCH_WITH_GROUNDING: (location, query) => `Context: ${location}. Query: "${query}". Return top 5 results as strict JSON [{"rank":1,"domain":"x","url":"y"}].`,
};
