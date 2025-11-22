/**
 * Google Gemini API client
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config, SerpResult } from './types';
import { getLogger } from './logger';
import {
  replacePromptPlaceholders,
  parseSerpJson,
  extractGeminiGroundingUrls,
  GeminiResponseWithGrounding,
} from './utils';
import { MODEL_TEMPERATURE } from './constants';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private config: Config;
  private logger = getLogger();

  constructor(config: Config) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  /**
   * Query Gemini without grounding (pure model knowledge, no search)
   *
   * @param prompt - User prompt/persona to query
   * @returns Array of SERP results or null if query fails
   */
  async queryWithoutGrounding(prompt: string): Promise<SerpResult[] | null> {
    try {
      const textPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.GEMINI_SEARCH_NO_GROUNDING,
        this.config.USER_LOCATION,
        prompt
      );

      this.logger.logRequest(
        'Gemini NoGrounding',
        this.config.MODEL_GEMINI,
        textPrompt
      );

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
          temperature: MODEL_TEMPERATURE.LOW,
        },
      });

      const response = await result.response;

      // Log RAW API response for transparency
      this.logger.logRawResponse('Gemini NoGrounding', response);

      const text = response.text();

      this.logger.logResponse(
        'Gemini NoGrounding',
        text ? 'SUCCESS' : 'EMPTY',
        text
      );

      return parseSerpJson(text);
    } catch (error) {
      this.logger.logError('Gemini No Grounding', error as Error);
      return null;
    }
  }

  /**
   * Query Gemini with grounding (Google Search enabled)
   *
   * @param prompt - User prompt/persona to query
   * @returns Array of SERP results or null if query fails
   */
  async queryWithGrounding(prompt: string): Promise<SerpResult[] | null> {
    try {
      const textPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.GEMINI_SEARCH_WITH_GROUNDING,
        this.config.USER_LOCATION,
        prompt
      );

      this.logger.logRequest(
        'Gemini WithGrounding',
        this.config.MODEL_GEMINI,
        textPrompt,
        { googleSearch: true }
      );

      const model = this.genAI.getGenerativeModel({
        model: this.config.MODEL_GEMINI,
        tools: [
          {
            googleSearch: {},
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ] as any, // Google Search grounding for Gemini 2.5 (undocumented type)
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
          temperature: MODEL_TEMPERATURE.LOW,
        },
      });

      const response = await result.response;

      // Log RAW API response for transparency
      this.logger.logRawResponse('Gemini WithGrounding', response);

      const text = response.text();

      this.logger.logResponse(
        'Gemini WithGrounding',
        text ? 'SUCCESS' : 'EMPTY',
        text
      );

      // Try to extract actual URLs from grounding metadata
      const groundingResults = extractGeminiGroundingUrls(
        response as unknown as GeminiResponseWithGrounding
      );
      if (groundingResults && groundingResults.length > 0) {
        return groundingResults;
      }

      // Fallback to parsing JSON from text
      return parseSerpJson(text);
    } catch (error) {
      this.logger.logError('Gemini With Grounding', error as Error);
      return null;
    }
  }
}
