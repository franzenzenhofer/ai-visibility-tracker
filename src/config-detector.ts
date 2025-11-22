/**
 * AI-powered configuration detection from sample data
 */

import OpenAI from 'openai';
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
export async function detectConfigFromQueries(
  queries: QueryRow[],
  apiKey: string,
  sampleSize: number = 20
): Promise<DetectedConfig> {
  const client = new OpenAI({ apiKey });

  // Take sample of queries
  const sampleQueries = queries
    .slice(0, sampleSize)
    .map(q => q.query)
    .join('\n');

  const prompt = `Analyze these search queries and detect:
1. Language (ISO 639-1 code: en, de, es, fr, etc.)
2. Geographic location/market (city and country)
3. Target domain (if any domain name appears frequently in queries)

Search Queries:
${sampleQueries}

Return ONLY a JSON object in this exact format:
{
  "language": "de",
  "location": "Vienna, Austria",
  "targetDomain": "example.com",
  "confidence": "high"
}

Rules:
- language: 2-letter ISO code
- location: "City, Country" format
- targetDomain: domain without protocol (or null if none detected)
- confidence: "high" if very clear, "medium" if somewhat clear, "low" if guessing

Respond with ONLY the JSON object, no explanations.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a data analyst expert at detecting language, location, and domain from search queries. Return only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI config detection');
  }

  // Parse JSON response
  try {
    const detected = JSON.parse(content) as DetectedConfig;
    return detected;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${content}`);
  }
}
