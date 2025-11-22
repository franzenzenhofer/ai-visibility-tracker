/**
 * Gemini query execution utilities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Config, SerpResult } from './types';
import { getLogger } from './logger';
import { replacePromptPlaceholders } from './prompt-utils';
import { parseSerpJson } from './serp-utils';
import {
  extractGeminiGroundingUrls,
  GeminiResponseWithGrounding,
} from './gemini-utils';
import { MODEL_TEMPERATURE } from './constants';

/**
 * Query Gemini without grounding (pure model knowledge, no search)
 *
 * @param genAI - GoogleGenerativeAI instance
 * @param config - Application configuration
 * @param prompt - User prompt/persona to query
 * @returns Array of SERP results or null if query fails
 */
export const queryWithoutGrounding = async (
  genAI: GoogleGenerativeAI,
  config: Config,
  prompt: string
): Promise<SerpResult[] | null> => {
  const logger = getLogger();

  try {
    const textPrompt = replacePromptPlaceholders(
      config.PROMPTS.GEMINI_SEARCH_NO_GROUNDING,
      config.USER_LOCATION,
      prompt
    );

    logger.logRequest(
      'Gemini NoGrounding',
      config.MODEL_GEMINI,
      textPrompt
    );

    const model = genAI.getGenerativeModel({
      model: config.MODEL_GEMINI,
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

    logger.logRawResponse('Gemini NoGrounding', response);

    const text = response.text();

    logger.logResponse(
      'Gemini NoGrounding',
      text ? 'SUCCESS' : 'EMPTY',
      text
    );

    return parseSerpJson(text);
  } catch (error) {
    logger.logError('Gemini No Grounding', error as Error);
    return null;
  }
};

/**
 * Query Gemini with grounding (Google Search enabled)
 *
 * @param genAI - GoogleGenerativeAI instance
 * @param config - Application configuration
 * @param prompt - User prompt/persona to query
 * @returns Array of SERP results or null if query fails
 */
export const queryWithGrounding = async (
  genAI: GoogleGenerativeAI,
  config: Config,
  prompt: string
): Promise<SerpResult[] | null> => {
  const logger = getLogger();

  try {
    const textPrompt = replacePromptPlaceholders(
      config.PROMPTS.GEMINI_SEARCH_WITH_GROUNDING,
      config.USER_LOCATION,
      prompt
    );

    logger.logRequest(
      'Gemini WithGrounding',
      config.MODEL_GEMINI,
      textPrompt,
      { googleSearch: true }
    );

    const model = genAI.getGenerativeModel({
      model: config.MODEL_GEMINI,
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

    logger.logRawResponse('Gemini WithGrounding', response);

    const text = response.text();

    logger.logResponse(
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
    logger.logError('Gemini With Grounding', error as Error);
    return null;
  }
};
