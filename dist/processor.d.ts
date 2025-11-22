/**
 * Main processor for AI visibility tracking
 */
import { Config, QueryRow, ProcessedResult, ProcessingStats } from './types';
export declare class VisibilityProcessor {
    private config;
    private openaiClient;
    private geminiClient;
    private queue;
    private stats;
    constructor(config: Config);
    /**
     * Process all queries
     */
    processQueries(queries: QueryRow[], onProgress?: (_current: number, _total: number, _query: string) => void): Promise<ProcessedResult[]>;
    /**
     * Process a single query
     *
     * @param queryRow - Query row to process
     * @returns Processed result with all variant responses
     */
    private processQuery;
    /**
     * Create error result when processing fails
     *
     * @param query - Original query that failed
     * @param reason - Error reason/message
     * @returns Error result with empty data
     */
    private createErrorResult;
    /**
     * Update processing statistics based on result
     *
     * @param result - Processed result to count
     */
    private updateStats;
    /**
     * Get current processing statistics
     *
     * @returns Copy of current statistics
     */
    getStats(): ProcessingStats;
}
