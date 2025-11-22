/**
 * AI-powered configuration detection from sample data
 */
import { QueryRow } from './types';
export interface DetectedConfig {
    language: string;
    location: string;
    targetDomain?: string;
    confidence: 'high' | 'medium' | 'low';
}
/**
 * Detect configuration from sample queries using AI
 *
 * @param queries - Sample queries from input file
 * @param apiKey - OpenAI API key
 * @param sampleSize - Number of queries to analyze (default: 20)
 * @returns Detected configuration
 */
export declare function detectConfigFromQueries(queries: QueryRow[], apiKey: string, sampleSize?: number): Promise<DetectedConfig>;
