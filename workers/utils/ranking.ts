/**
 * Ranking utilities - extracted from processor
 * 22 lines - compliant with ≤75 rule
 */

import { SerpResult } from '../../src/types';
import { normalizeDomain, extractDomainFromUrl } from '../../src/domain-utils';

export const findRank = (results: SerpResult[], targetDomain: string) => {
  const match = results.find((r) => {
    const d = normalizeDomain(extractDomainFromUrl(r.url));
    return d.includes(targetDomain) || targetDomain.includes(d);
  });
  return match ? { rank: match.rank, url: match.url } : { rank: '-', url: '-' };
};

export const determineStatus = (
  gptRank: string | number,
  gemRank: string | number,
  gptWebRank: string | number,
  gemWebRank: string | number,
  hasError: boolean,
  RESULT_STATUS: { ERROR: string; VISIBLE: string; TOOL_ONLY: string; INVISIBLE: string }
): string => {
  if (hasError) return RESULT_STATUS.ERROR;
  if (gptRank !== '-' || gemRank !== '-') return RESULT_STATUS.VISIBLE;
  if (gptWebRank !== '-' || gemWebRank !== '-') return RESULT_STATUS.TOOL_ONLY;
  return RESULT_STATUS.INVISIBLE;
};
