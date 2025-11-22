/**
 * OpenAI query execution utilities
 */

import OpenAI from 'openai';
import { Config, SerpResult } from './types';
import { getLogger } from './logger';
import { replacePromptPlaceholders } from './prompt-utils';
import { parseSerpJson } from './serp-utils';
import { LOCATION_CONFIG } from './constants';

/**
 * Query GPT without search tools (pure model knowledge)
 *
 * @param client - OpenAI client instance
 * @param config - Application configuration
 * @param prompt - User prompt/persona to query
 * @returns Array of SERP results or null if query fails
 */
export const queryWithoutTools = async (
  client: OpenAI,
  config: Config,
  prompt: string
): Promise<SerpResult[] | null> => {
  const logger = getLogger();

  try {
    const systemPrompt = replacePromptPlaceholders(
      config.PROMPTS.OPENAI_SEARCH_NO_TOOLS_SYSTEM,
      config.USER_LOCATION
    );
    const userPrompt = replacePromptPlaceholders(
      config.PROMPTS.OPENAI_SEARCH_NO_TOOLS_USER,
      config.USER_LOCATION,
      prompt
    );

    logger.logRequest(
      'OpenAI NoTools',
      config.MODEL_OPENAI,
      `System: ${systemPrompt}\nUser: ${userPrompt}`
    );

    const response = await client.chat.completions.create({
      model: config.MODEL_OPENAI,
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

    logger.logRawResponse('OpenAI NoTools', response);

    const content = response.choices[0]?.message?.content;
    logger.logResponse(
      'OpenAI NoTools',
      content ? 'SUCCESS' : 'EMPTY',
      content
    );

    if (!content) {
      return null;
    }

    return parseSerpJson(content);
  } catch (error) {
    logger.logError('OpenAI No Tools', error as Error);
    return null;
  }
};

/**
 * Query GPT with REAL web search using Responses API
 *
 * @param client - OpenAI client instance
 * @param config - Application configuration
 * @param prompt - User prompt/persona to query
 * @returns Array of SERP results or null if query fails
 */
export const queryWithTools = async (
  client: OpenAI,
  config: Config,
  prompt: string
): Promise<SerpResult[] | null> => {
  const logger = getLogger();

  try {
    const systemPrompt = replacePromptPlaceholders(
      config.PROMPTS.OPENAI_SEARCH_WITH_TOOLS_SYSTEM,
      config.USER_LOCATION
    );
    const userPrompt = replacePromptPlaceholders(
      config.PROMPTS.OPENAI_SEARCH_WITH_TOOLS_USER,
      config.USER_LOCATION,
      prompt
    );
    const inputPrompt = `${systemPrompt}\n\n${userPrompt}`;

    logger.logRequest(
      'OpenAI WithTools (Responses API)',
      config.MODEL_OPENAI,
      inputPrompt,
      {
        tool: 'web_search',
        user_location: config.USER_LOCATION,
      }
    );

    // Use Responses API with REAL web search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client as any).responses.create({
      model: config.MODEL_OPENAI,
      tools: [
        {
          type: 'web_search',
          user_location: {
            type: 'approximate',
            city: config.USER_LOCATION.split(',')[0].trim(),
            country: LOCATION_CONFIG.DEFAULT_COUNTRY_CODE,
          },
        },
      ],
      input: inputPrompt,
    });

    logger.logRawResponse('OpenAI WithTools (Responses API)', response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = (response as any).output_text || (response as any).output?.[0]?.content?.[0]?.text;

    logger.logResponse(
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
    logger.logError('OpenAI With Tools (Responses API)', error as Error);
    return null;
  }
};
