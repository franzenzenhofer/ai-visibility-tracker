/**
 * Google Gemini API client
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config, SerpResult } from './types';
import { getLogger } from './logger';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private config: Config;
  private logger = getLogger();

  constructor(config: Config) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  /**
   * Replace placeholders in prompts
   */
  private replacePromptPlaceholders(prompt: string, query?: string): string {
    return prompt
      .replace(/{location}/g, this.config.USER_LOCATION)
      .replace(/{query}/g, query || '');
  }

  /**
   * Query Gemini without grounding (no search)
   */
  async queryWithoutGrounding(prompt: string): Promise<SerpResult[] | null> {
    try {
      const textPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.GEMINI_SEARCH_NO_GROUNDING, prompt);

      this.logger.logRequest('Gemini NoGrounding', this.config.MODEL_GEMINI, textPrompt);

      const model = this.genAI.getGenerativeModel({
        model: this.config.MODEL_GEMINI,
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: textPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      });

      const response = await result.response;

      // Log RAW API response for transparency
      this.logger.logRawResponse('Gemini NoGrounding', response);

      const text = response.text();

      this.logger.logResponse('Gemini NoGrounding', text ? 'SUCCESS' : 'EMPTY', text);

      return this.parseSerpJson(text);
    } catch (error) {
      this.logger.logError('Gemini No Grounding', error as Error);
      return null;
    }
  }

  /**
   * Query Gemini with grounding (Google Search)
   */
  async queryWithGrounding(prompt: string): Promise<SerpResult[] | null> {
    try {
      const textPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.GEMINI_SEARCH_WITH_GROUNDING, prompt);

      this.logger.logRequest('Gemini WithGrounding', this.config.MODEL_GEMINI, textPrompt, { googleSearch: true });

      const model = this.genAI.getGenerativeModel({
        model: this.config.MODEL_GEMINI,
        tools: [
          {
            googleSearch: {},
          } as any, // Google Search grounding for Gemini 2.5
        ],
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: textPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      });

      const response = await result.response;

      // Log RAW API response for transparency
      this.logger.logRawResponse('Gemini WithGrounding', response);

      const text = response.text();

      this.logger.logResponse('Gemini WithGrounding', text ? 'SUCCESS' : 'EMPTY', text);

      // Try to extract actual URLs from grounding metadata
      const groundingResults = this.extractGroundingUrls(response);
      if (groundingResults && groundingResults.length > 0) {
        return groundingResults;
      }

      // Fallback to parsing JSON from text
      return this.parseSerpJson(text);
    } catch (error) {
      this.logger.logError('Gemini With Grounding', error as Error);
      return null;
    }
  }

  /**
   * Extract actual URLs from Gemini grounding metadata
   */
  private extractGroundingUrls(response: any): SerpResult[] | null {
    try {
      // Access grounding metadata/chunks
      const metadata = response.groundingMetadata || response.grounding_metadata;
      if (!metadata) return null;

      const chunks = metadata.groundingChunks || metadata.grounding_chunks || metadata.webSearchQueries || [];
      if (!Array.isArray(chunks) || chunks.length === 0) return null;

      // Extract URLs from chunks
      const results: SerpResult[] = [];
      for (let i = 0; i < Math.min(5, chunks.length); i++) {
        const chunk = chunks[i];
        const uri = chunk.uri || chunk.url || chunk.web?.uri || chunk.web?.url;

        if (uri && !uri.includes('grounding-api-redirect')) {
          try {
            const url = new URL(uri);
            const domain = url.hostname.replace(/^www\./, '').toLowerCase();
            results.push({
              rank: i + 1,
              domain: domain,
              url: uri,
            });
          } catch {
            // Invalid URL, skip
          }
        }
      }

      return results.length > 0 ? results : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse SERP JSON from response
   */
  private parseSerpJson(text: string): SerpResult[] | null {
    try {
      // Extract JSON array from text
      const match = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (!match) return null;

      const arr = JSON.parse(match[0]);
      if (!Array.isArray(arr)) return null;

      // Normalize keys (handle 'link', 'url', 'href')
      return arr.map(item => {
        const url = item.url || item.link || item.href || '';
        let domain = item.domain || '';

        // Extract domain from URL if not provided
        if (!domain && url) {
          try {
            domain = new URL(url).hostname.toLowerCase();
          } catch {
            domain = '';
          }
        }

        // Normalize domain (remove www. prefix)
        domain = domain.replace(/^www\./, '');

        return {
          rank: item.rank || 0,
          domain: domain,
          url: url,
        };
      });
    } catch (error) {
      console.error('Failed to parse SERP JSON:', error);
      return null;
    }
  }
}
