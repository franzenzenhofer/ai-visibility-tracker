/**
 * Main processor for AI visibility tracking
 */

import PQueue from 'p-queue';
import { Config, QueryRow, ProcessedResult, ProcessingStats, SerpResult } from './types';
import { OpenAIClient } from './openai-client';
import { GeminiClient } from './gemini-client';

export class VisibilityProcessor {
  private config: Config;
  private openaiClient: OpenAIClient;
  private geminiClient: GeminiClient;
  private queue: PQueue;
  private stats: ProcessingStats;

  constructor(config: Config) {
    this.config = config;
    this.openaiClient = new OpenAIClient(config);
    this.geminiClient = new GeminiClient(config);
    this.queue = new PQueue({ concurrency: 3 }); // Limit concurrent API calls
    this.stats = {
      total: 0,
      processed: 0,
      visible: 0,
      invisible: 0,
      toolOnly: 0,
      errors: 0,
    };
  }

  /**
   * Process all queries
   */
  async processQueries(
    queries: QueryRow[],
    onProgress?: (_current: number, _total: number, _query: string) => void
  ): Promise<ProcessedResult[]> {
    this.stats.total = queries.length;
    const results: ProcessedResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      if (onProgress) {
        onProgress(i + 1, queries.length, query.query);
      }

      try {
        const result = await this.processQuery(query);
        results.push(result);
        this.updateStats(result);
      } catch (error) {
        console.error(`Error processing query "${query.query}":`, error);
        results.push(this.createErrorResult(query.query));
        this.stats.errors++;
      }

      // Rate limiting delay
      await this.sleep(500);
    }

    return results;
  }

  /**
   * Process a single query
   */
  private async processQuery(queryRow: QueryRow): Promise<ProcessedResult> {
    const { query } = queryRow;

    // Step 1: Generate persona
    const persona = await this.openaiClient.generatePersona(query);
    if (!persona) {
      return this.createErrorResult(query, 'Failed to generate persona');
    }

    // Step 2: Parallel matrix queries (4 variants)
    const [gptNoTool, gptWithTool, gemNoGrounding, gemWithGrounding] = await Promise.all([
      this.openaiClient.queryWithoutTools(persona),
      this.openaiClient.queryWithTools(persona),
      this.geminiClient.queryWithoutGrounding(persona),
      this.geminiClient.queryWithGrounding(persona),
    ]);

    // Step 3: Analyze results
    const targetDomain = this.config.TARGET_DOMAIN.toLowerCase();

    const findRank = (results: SerpResult[] | null): { rank: number | string; url: string } => {
      if (!results || results.length === 0) {
        return { rank: '-', url: '-' };
      }

      const found = results.find(
        r => r.domain.includes(targetDomain) || r.url.includes(targetDomain)
      );

      if (found) {
        return { rank: found.rank, url: found.url };
      }

      return { rank: '-', url: '-' };
    };

    const r1 = findRank(gptNoTool);
    const r2 = findRank(gptWithTool);
    const r3 = findRank(gemNoGrounding);
    const r4 = findRank(gemWithGrounding);

    // Step 4: Determine status
    let status: 'visible' | 'invisible' | 'tool-only' | 'error' = 'invisible';

    // Check if all APIs failed
    if (!gptNoTool && !gptWithTool && !gemNoGrounding && !gemWithGrounding) {
      status = 'error';
    } else if (r1.rank !== '-' || r2.rank !== '-' || r3.rank !== '-' || r4.rank !== '-') {
      status = 'visible';

      // Check if only visible with tools
      if ((r1.rank === '-' && r3.rank === '-') && (r2.rank !== '-' || r4.rank !== '-')) {
        status = 'tool-only';
      }
    }

    return {
      originalQuery: query,
      personaPrompt: persona,
      status,
      // Store all results
      gptNoToolResults: gptNoTool || [],
      gptWithToolResults: gptWithTool || [],
      gemNoGroundingResults: gemNoGrounding || [],
      gemWithGroundingResults: gemWithGrounding || [],
      // Legacy fields for CSV compatibility
      gptRank: r1.rank,
      gptUrl: r1.url,
      gptRankWeb: r2.rank,
      gptUrlWeb: r2.url,
      gemRank: r3.rank,
      gemUrl: r3.url,
      gemRankWeb: r4.rank,
      gemUrlWeb: r4.url,
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(query: string, reason: string = 'Processing error'): ProcessedResult {
    return {
      originalQuery: query,
      personaPrompt: reason,
      status: 'error',
      gptNoToolResults: [],
      gptWithToolResults: [],
      gemNoGroundingResults: [],
      gemWithGroundingResults: [],
      gptRank: '-',
      gptUrl: '-',
      gptRankWeb: '-',
      gptUrlWeb: '-',
      gemRank: '-',
      gemUrl: '-',
      gemRankWeb: '-',
      gemUrlWeb: '-',
    };
  }

  /**
   * Update statistics
   */
  private updateStats(result: ProcessedResult): void {
    this.stats.processed++;

    switch (result.status) {
      case 'visible':
        this.stats.visible++;
        break;
      case 'invisible':
        this.stats.invisible++;
        break;
      case 'tool-only':
        this.stats.toolOnly++;
        break;
      case 'error':
        this.stats.errors++;
        break;
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
