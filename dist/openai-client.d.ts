/**
 * OpenAI API client
 */
import { Config, SerpResult } from './types';
export declare class OpenAIClient {
    private client;
    private config;
    private logger;
    constructor(config: Config);
    /**
     * Generate persona prompt from keyword
     *
     * @param keyword - Search keyword to create persona for
     * @returns Persona prompt or null if generation fails
     */
    generatePersona(keyword: string): Promise<string | null>;
    /**
     * Query GPT without search tools (pure model knowledge)
     *
     * @param prompt - User prompt/persona to query
     * @returns Array of SERP results or null if query fails
     */
    queryWithoutTools(prompt: string): Promise<SerpResult[] | null>;
    /**
     * Query GPT with REAL web search using Responses API
     * Uses web_search tool for actual web searches
     *
     * @param prompt - User prompt/persona to query
     * @returns Array of SERP results or null if query fails
     */
    queryWithTools(prompt: string): Promise<SerpResult[] | null>;
}
