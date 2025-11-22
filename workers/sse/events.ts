/**
 * SSE event senders - REUSES src/types.ts ProcessedResult
 * 56 lines - compliant with ≤75 rule
 */

import { ProcessedResult, SerpResult } from '../../src/types';
import { sendSSE } from './stream';

export const sendInit = (w: WritableStreamDefaultWriter<string>, total: number) =>
  sendSSE(w, 'init', { total });

export const sendQueryStart = (w: WritableStreamDefaultWriter<string>, index: number, query: string) =>
  sendSSE(w, 'query_start', { index, query });

export const sendStep = async (
  w: WritableStreamDefaultWriter<string>,
  step: string,
  data: { result?: string; urls?: SerpResult[]; status?: string }
): Promise<void> => {
  await sendSSE(w, 'step', { step, ...data });
};

export const sendQueryComplete = async (
  w: WritableStreamDefaultWriter<string>,
  result: ProcessedResult
): Promise<void> => {
  await sendSSE(w, 'query_complete', result);
};

export const sendProgress = (w: WritableStreamDefaultWriter<string>, current: number, total: number) =>
  sendSSE(w, 'progress', { current, total });

export const sendError = (w: WritableStreamDefaultWriter<string>, error: string) =>
  sendSSE(w, 'error', { error });

export const sendComplete = (w: WritableStreamDefaultWriter<string>, stats: Record<string, number>) =>
  sendSSE(w, 'complete', stats);

export const sendApiRequest = (w: WritableStreamDefaultWriter<string>, service: string, model: string, prompt: string) =>
  sendSSE(w, 'api_request', { service, model, prompt });

export const sendApiResponse = (w: WritableStreamDefaultWriter<string>, service: string, result: string | SerpResult[] | null, elapsed?: number) =>
  sendSSE(w, 'api_response', { service, result, elapsed });
