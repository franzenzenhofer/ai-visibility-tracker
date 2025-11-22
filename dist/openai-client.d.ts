/**
 * OpenAI API client
 */
import { Config, SerpResult } from './types';
export declare class OpenAIClient {
    private client;
    private config;
    constructor(config: Config);
    generatePersona(keyword: string): Promise<string | null>;
    queryWithoutTools(prompt: string): Promise<SerpResult[] | null>;
    queryWithTools(prompt: string): Promise<SerpResult[] | null>;
}
