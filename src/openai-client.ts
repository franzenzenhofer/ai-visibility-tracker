/**
 * OpenAI API client
 */

import OpenAI from 'openai';
import { Config, SerpResult } from './types';
import { getLogger } from './logger';

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
   * Replace placeholders in prompts
   */
  private replacePromptPlaceholders(prompt: string, query?: string): string {
    return prompt
      .replace(/{location}/g, this.config.USER_LOCATION)
      .replace(/{query}/g, query || '');
  }

  /**
   * Generate persona prompt from keyword
   */
  async generatePersona(keyword: string): Promise<string | null> {
    try {
      const systemPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.OPENAI_PERSONA_SYSTEM);

      // Add language instruction to the system prompt
      // The LLM understands language codes: en, de, es, fr, etc.
      const systemPromptWithLanguage = `${systemPrompt}\n\nIMPORTANT: You MUST return the result in the language code: ${this.config.LANGUAGE.toUpperCase()}`;

      this.logger.logRequest('OpenAI Persona', this.config.MODEL_OPENAI, `System: ${systemPromptWithLanguage}\nUser: ${keyword}`);

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
   * Query GPT without search tools
   */
  async queryWithoutTools(prompt: string): Promise<SerpResult[] | null> {
    try {
      const systemPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.OPENAI_SEARCH_NO_TOOLS_SYSTEM);
      const userPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.OPENAI_SEARCH_NO_TOOLS_USER, prompt);

      this.logger.logRequest('OpenAI NoTools', this.config.MODEL_OPENAI, `System: ${systemPrompt}\nUser: ${userPrompt}`);

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
      this.logger.logResponse('OpenAI NoTools', content ? 'SUCCESS' : 'EMPTY', content);

      if (!content) return null;

      return this.parseSerpJson(content);
    } catch (error) {
      this.logger.logError('OpenAI No Tools', error as Error);
      return null;
    }
  }

  /**
   * Query GPT with REAL web search using Responses API
   * Uses web_search tool for actual web searches
   */
  async queryWithTools(prompt: string): Promise<SerpResult[] | null> {
    try {
      const systemPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.OPENAI_SEARCH_WITH_TOOLS_SYSTEM);
      const userPrompt = this.replacePromptPlaceholders(this.config.PROMPTS.OPENAI_SEARCH_WITH_TOOLS_USER, prompt);
      const inputPrompt = `${systemPrompt}\n\n${userPrompt}`;

      this.logger.logRequest('OpenAI WithTools (Responses API)', this.config.MODEL_OPENAI, inputPrompt, {
        tool: 'web_search',
        user_location: this.config.USER_LOCATION,
      });

      // Use Responses API with REAL web search
      // @ts-ignore - responses API types may not be complete
      const response = await this.client.responses.create({
        model: this.config.MODEL_OPENAI,
        tools: [
          {
            type: 'web_search',
            user_location: {
              type: 'approximate',
              city: this.config.USER_LOCATION.split(',')[0].trim(),
              country: 'AT', // Austria - could be made configurable
            },
          },
        ],
        input: inputPrompt,
      });

      // Log RAW API response for transparency
      this.logger.logRawResponse('OpenAI WithTools (Responses API)', response);

      // @ts-ignore
      const content = response.output_text || response.output?.[0]?.content?.[0]?.text;

      this.logger.logResponse('OpenAI WithTools (Responses API)', content ? 'SUCCESS' : 'EMPTY', content, {
        // @ts-ignore
        sources: response.sources,
      });

      if (!content) return null;

      return this.parseSerpJson(content);
    } catch (error) {
      this.logger.logError('OpenAI With Tools (Responses API)', error as Error);
      // NO FALLBACK - If web search doesn't work, we fail
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
