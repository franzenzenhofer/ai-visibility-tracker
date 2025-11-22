/**
 * All prompts used in the application
 * Edit these prompts to customize the behavior
 */
export declare const PROMPTS: {
    OPENAI_PERSONA_SYSTEM: (location: string) => string;
    OPENAI_SEARCH_NO_TOOLS_SYSTEM: (location: string) => string;
    OPENAI_SEARCH_NO_TOOLS_USER: (query: string) => string;
    OPENAI_SEARCH_WITH_TOOLS_SYSTEM: (location: string) => string;
    OPENAI_SEARCH_WITH_TOOLS_USER: (query: string) => string;
    GEMINI_SEARCH_NO_GROUNDING: (location: string, query: string) => string;
    GEMINI_SEARCH_WITH_GROUNDING: (location: string, query: string) => string;
};
