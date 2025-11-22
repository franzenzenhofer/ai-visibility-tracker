/**
 * Google Gemini API client
 */
import { Config, SerpResult } from './types';
export declare class GeminiClient {
    private genAI;
    private config;
    private logger;
    constructor(config: Config);
    /**
     * Query Gemini without grounding (pure model knowledge, no search)
     *
     * @param prompt - User prompt/persona to query
     * @returns Array of SERP results or null if query fails
     */
    queryWithoutGrounding(prompt: string): Promise<SerpResult[] | null>;
    /**
     * Query Gemini with grounding (Google Search enabled)
     *
     * @param prompt - User prompt/persona to query
     * @returns Array of SERP results or null if query fails
     */
    queryWithGrounding(prompt: string): Promise<SerpResult[] | null>;
}
