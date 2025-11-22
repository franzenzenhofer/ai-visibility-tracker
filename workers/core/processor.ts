/**
 * Query processor - UNIFIED API call logic with guaranteed parallel execution
 * DRY - Reuses src/openai-client, src/gemini-client, src/logger
 */

import { Config, ProcessedResult, QueryRow, ResultStatus } from '../../src/types';
import { OpenAIClient } from '../../src/openai-client';
import { GeminiClient } from '../../src/gemini-client';
import { normalizeDomain } from '../../src/domain-utils';
import { RESULT_STATUS } from '../../src/constants';
import { sendStep, sendApiRequest, sendApiResponse } from '../sse/events';
import { findRank, determineStatus } from '../utils/ranking';
import { getLogger } from '../../src/logger';
import { parallelApiCalls } from '../utils/api-caller';

export const processQuery = async (
  query: QueryRow,
  config: Config,
  writer: WritableStreamDefaultWriter<string>
): Promise<ProcessedResult> => {
  const logger = getLogger();
  logger.setSseWriter(writer, { sendApiRequest, sendApiResponse });
  const openai = new OpenAIClient(config);
  const gemini = new GeminiClient(config);

  const persona = await openai.generatePersona(query.query);
  await sendStep(writer, 'persona', { result: persona || 'Failed' });
  if (!persona) throw new Error('Persona generation failed');

  // ONE UNIFIED LOGIC for all 4 API calls - GUARANTEED parallel execution!
  // Each call has independent error handling - one failure won't break others
  const [gptNoTool, gptWithTool, gemNoGround, gemWithGround] = await parallelApiCalls([
    { name: 'GPT_NoTools', execute: () => openai.queryWithoutTools(persona), defaultValue: [] },
    { name: 'GPT_WithTools', execute: () => openai.queryWithTools(persona), defaultValue: [] },
    { name: 'Gemini_NoGrounding', execute: () => gemini.queryWithoutGrounding(persona), defaultValue: [] },
    { name: 'Gemini_WithGrounding', execute: () => gemini.queryWithGrounding(persona), defaultValue: [] },
  ]);
  // Send step updates after all complete
  await Promise.all([
    sendStep(writer, 'gpt_no_tools', { urls: gptNoTool }),
    sendStep(writer, 'gpt_with_tools', { urls: gptWithTool }),
    sendStep(writer, 'gemini_no_grounding', { urls: gemNoGround }),
    sendStep(writer, 'gemini_with_grounding', { urls: gemWithGround }),
  ]);
  logger.setSseWriter(null);

  const targetDomain = normalizeDomain(config.TARGET_DOMAIN);
  const gpt = findRank(gptNoTool, targetDomain);
  const gptWeb = findRank(gptWithTool, targetDomain);
  const gem = findRank(gemNoGround, targetDomain);
  const gemWeb = findRank(gemWithGround, targetDomain);
  const hasError = !gptNoTool && !gptWithTool && !gemNoGround && !gemWithGround;
  const status = determineStatus(gpt.rank, gem.rank, gptWeb.rank, gemWeb.rank, hasError, RESULT_STATUS) as ResultStatus;
  await sendStep(writer, 'status', { status });

  return {
    originalQuery: query.query,
    personaPrompt: persona,
    status,
    gptNoToolResults: gptNoTool,
    gptWithToolResults: gptWithTool,
    gemNoGroundingResults: gemNoGround,
    gemWithGroundingResults: gemWithGround,
    gptRank: gpt.rank,
    gptUrl: gpt.url,
    gptRankWeb: gptWeb.rank,
    gptUrlWeb: gptWeb.url,
    gemRank: gem.rank,
    gemUrl: gem.url,
    gemRankWeb: gemWeb.rank,
    gemUrlWeb: gemWeb.url,
  };
};
