/**
 * Google Gemini API client
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config, SerpResult } from './types';
import { queryWithoutGrounding, queryWithGrounding } from './gemini-queries';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  async queryWithoutGrounding(prompt: string): Promise<SerpResult[] | null> {
    return queryWithoutGrounding(this.genAI, this.config, prompt);
  }

  async queryWithGrounding(prompt: string): Promise<SerpResult[] | null> {
    return queryWithGrounding(this.genAI, this.config, prompt);
  }
}
