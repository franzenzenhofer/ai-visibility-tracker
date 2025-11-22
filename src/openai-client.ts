/**
 * OpenAI API client
 */

import OpenAI from 'openai';
import { Config, SerpResult } from './types';
import { getLogger } from './logger';
import { replacePromptPlaceholders, parseSerpJson } from './utils';
import { LOCATION_CONFIG } from './constants';

export class OpenAIClient {
  private client: OpenAI;
  private config: Config;
  private logger = getLogger();

  constructor(config: Config) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  /**
   * Generate persona prompt from keyword
   *
   * @param keyword - Search keyword to create persona for
   * @returns Persona prompt or null if generation fails
   */
  async generatePersona(keyword: string): Promise<string | null> {
    try {
      const systemPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.OPENAI_PERSONA_SYSTEM,
        this.config.USER_LOCATION
      );

      // Add language instruction to the system prompt
      // The LLM understands language codes: en, de, es, fr, etc.
      const systemPromptWithLanguage = `${systemPrompt}\n\nIMPORTANT: You MUST return the result in the language code: ${this.config.LANGUAGE.toUpperCase()}`;

      this.logger.logRequest(
        'OpenAI Persona',
        this.config.MODEL_OPENAI,
        `System: ${systemPromptWithLanguage}\nUser: ${keyword}`
      );

      const response = await this.client.chat.completions.create({
        model: this.config.MODEL_OPENAI,
        messages: [
          {
            role: 'system',
            content: systemPromptWithLanguage,
          },
          {
            role: 'user',
            content: keyword,
          },
        ],
      });

      // Log RAW API response for transparency
      this.logger.logRawResponse('OpenAI Persona', response);

      const result = response.choices[0]?.message?.content || null;
      this.logger.logResponse('OpenAI Persona', 'SUCCESS', result);

      return result;
    } catch (error) {
      this.logger.logError('OpenAI Persona Generation', error as Error);
      return null;
    }
  }

  /**
   * Query GPT without search tools (pure model knowledge)
   *
   * @param prompt - User prompt/persona to query
   * @returns Array of SERP results or null if query fails
   */
  async queryWithoutTools(prompt: string): Promise<SerpResult[] | null> {
    try {
      const systemPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.OPENAI_SEARCH_NO_TOOLS_SYSTEM,
        this.config.USER_LOCATION
      );
      const userPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.OPENAI_SEARCH_NO_TOOLS_USER,
        this.config.USER_LOCATION,
        prompt
      );

      this.logger.logRequest(
        'OpenAI NoTools',
        this.config.MODEL_OPENAI,
        `System: ${systemPrompt}\nUser: ${userPrompt}`
      );

      const response = await this.client.chat.completions.create({
        model: this.config.MODEL_OPENAI,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Log RAW API response for transparency
      this.logger.logRawResponse('OpenAI NoTools', response);

      const content = response.choices[0]?.message?.content;
      this.logger.logResponse(
        'OpenAI NoTools',
        content ? 'SUCCESS' : 'EMPTY',
        content
      );

      if (!content) {
        return null;
      }

      return parseSerpJson(content);
    } catch (error) {
      this.logger.logError('OpenAI No Tools', error as Error);
      return null;
    }
  }

  /**
   * Query GPT with REAL web search using Responses API
   * Uses web_search tool for actual web searches
   *
   * @param prompt - User prompt/persona to query
   * @returns Array of SERP results or null if query fails
   */
  async queryWithTools(prompt: string): Promise<SerpResult[] | null> {
    try {
      const systemPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.OPENAI_SEARCH_WITH_TOOLS_SYSTEM,
        this.config.USER_LOCATION
      );
      const userPrompt = replacePromptPlaceholders(
        this.config.PROMPTS.OPENAI_SEARCH_WITH_TOOLS_USER,
        this.config.USER_LOCATION,
        prompt
      );
      const inputPrompt = `${systemPrompt}\n\n${userPrompt}`;

      this.logger.logRequest(
        'OpenAI WithTools (Responses API)',
        this.config.MODEL_OPENAI,
        inputPrompt,
        {
          tool: 'web_search',
          user_location: this.config.USER_LOCATION,
        }
      );

      // Use Responses API with REAL web search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.client as any).responses.create({
        model: this.config.MODEL_OPENAI,
        tools: [
          {
            type: 'web_search',
            user_location: {
              type: 'approximate',
              city: this.config.USER_LOCATION.split(',')[0].trim(),
              country: LOCATION_CONFIG.DEFAULT_COUNTRY_CODE,
            },
          },
        ],
        input: inputPrompt,
      });

      // Log RAW API response for transparency
      this.logger.logRawResponse('OpenAI WithTools (Responses API)', response);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (response as any).output_text || (response as any).output?.[0]?.content?.[0]?.text;

      this.logger.logResponse(
        'OpenAI WithTools (Responses API)',
        content ? 'SUCCESS' : 'EMPTY',
        content,
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sources: (response as any).sources,
        }
      );

      if (!content) {
        return null;
      }

      return parseSerpJson(content);
    } catch (error) {
      this.logger.logError('OpenAI With Tools (Responses API)', error as Error);
      // NO FALLBACK - If web search doesn't work, we fail
      return null;
    }
  }
}
