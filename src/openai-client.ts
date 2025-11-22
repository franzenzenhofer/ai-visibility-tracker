/**
 * OpenAI API client
 */

import OpenAI from 'openai';
import { Config, SerpResult } from './types';
import { generatePersona } from './openai-persona';
import { queryWithoutTools, queryWithTools } from './openai-queries';

export class OpenAIClient {
  private client: OpenAI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  async generatePersona(keyword: string): Promise<string | null> {
    return generatePersona(this.client, this.config, keyword);
  }

  async queryWithoutTools(prompt: string): Promise<SerpResult[] | null> {
    return queryWithoutTools(this.client, this.config, prompt);
  }

  async queryWithTools(prompt: string): Promise<SerpResult[] | null> {
    return queryWithTools(this.client, this.config, prompt);
  }
}
