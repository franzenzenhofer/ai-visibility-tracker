/**
 * Query processor with SSE - REUSES src/openai-client, src/gemini-client
 * 59 lines - compliant with ≤75 rule (refactored)
 */

import { Config, ProcessedResult, QueryRow, ResultStatus } from '../../src/types';
import { OpenAIClient } from '../../src/openai-client';
import { GeminiClient } from '../../src/gemini-client';
import { normalizeDomain } from '../../src/domain-utils';
import { RESULT_STATUS } from '../../src/constants';
import { sendStep } from '../sse/events';
import { findRank, determineStatus } from '../utils/ranking';

export const processQuery = async (
  query: QueryRow,
  config: Config,
  writer: WritableStreamDefaultWriter<string>
): Promise<ProcessedResult> => {
  const openai = new OpenAIClient(config);
  const gemini = new GeminiClient(config);

  const persona = await openai.generatePersona(query.query);
  await sendStep(writer, 'persona', { result: persona || 'Failed' });
  if (!persona) throw new Error('Persona generation failed');

  const [gptNoTool, gptWithTool, gemNoGround, gemWithGround] = await Promise.all([
    openai.queryWithoutTools(persona).then((r) => r || []),
    openai.queryWithTools(persona).then((r) => r || []),
    gemini.queryWithoutGrounding(persona).then((r) => r || []),
    gemini.queryWithGrounding(persona).then((r) => r || []),
  ]);

  await sendStep(writer, 'gpt_no_tools', { urls: gptNoTool });
  await sendStep(writer, 'gpt_with_tools', { urls: gptWithTool });
  await sendStep(writer, 'gemini_no_grounding', { urls: gemNoGround });
  await sendStep(writer, 'gemini_with_grounding', { urls: gemWithGround });

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
