/**
 * OpenAI persona generation
 */

import OpenAI from 'openai';
import { Config } from './types';
import { getLogger } from './logger';
import { replacePromptPlaceholders } from './prompt-utils';

/**
 * Generate persona prompt from keyword using OpenAI
 *
 * @param client - OpenAI client instance
 * @param config - Application configuration
 * @param keyword - Search keyword to create persona for
 * @returns Persona prompt or null if generation fails
 */
export const generatePersona = async (
  client: OpenAI,
  config: Config,
  keyword: string
): Promise<string | null> => {
  const logger = getLogger();

  try {
    const systemPrompt = replacePromptPlaceholders(
      config.PROMPTS.OPENAI_PERSONA_SYSTEM,
      config.USER_LOCATION
    );

    // Add language instruction to the system prompt
    const systemPromptWithLanguage = `${systemPrompt}\n\nIMPORTANT: You MUST return the result in the language code: ${config.LANGUAGE.toUpperCase()}`;

    logger.logRequest(
      'OpenAI Persona',
      config.MODEL_OPENAI,
      `System: ${systemPromptWithLanguage}\nUser: ${keyword}`
    );

    const response = await client.chat.completions.create({
      model: config.MODEL_OPENAI,
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
    logger.logRawResponse('OpenAI Persona', response);

    const result = response.choices[0]?.message?.content || null;
    logger.logResponse('OpenAI Persona', 'SUCCESS', result);

    return result;
  } catch (error) {
    logger.logError('OpenAI Persona Generation', error as Error);
    return null;
  }
};
