/**
 * Google Gemini API client
 */
import { Config, SerpResult } from './types';
export declare class GeminiClient {
    private genAI;
    private config;
    constructor(config: Config);
    queryWithoutGrounding(prompt: string): Promise<SerpResult[] | null>;
    queryWithGrounding(prompt: string): Promise<SerpResult[] | null>;
}
