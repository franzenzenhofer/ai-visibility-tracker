/**
 * Stats calculation helper - extracted from routes/process.ts
 * 18 lines - compliant with ≤75 rule
 */

import { ProcessedResult } from '../../src/types';
import { RESULT_STATUS } from '../../src/constants';

export const calculateStats = (results: ProcessedResult[]) => ({
  total: results.length,
  visible: results.filter((r) => r.status === RESULT_STATUS.VISIBLE).length,
  invisible: results.filter((r) => r.status === RESULT_STATUS.INVISIBLE).length,
  toolOnly: results.filter((r) => r.status === RESULT_STATUS.TOOL_ONLY).length,
  errors: results.filter((r) => r.status === RESULT_STATUS.ERROR).length,
});

export const createErrorResult = (query: string): ProcessedResult => ({
  originalQuery: query,
  personaPrompt: '',
  status: RESULT_STATUS.ERROR,
  gptNoToolResults: [],
  gptWithToolResults: [],
  gemNoGroundingResults: [],
  gemWithGroundingResults: [],
  gptRank: '-',
  gptUrl: '-',
  gptRankWeb: '-',
  gptUrlWeb: '-',
  gemRank: '-',
  gemUrl: '-',
  gemRankWeb: '-',
  gemUrlWeb: '-',
});
