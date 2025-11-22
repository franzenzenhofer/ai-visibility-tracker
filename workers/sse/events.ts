/**
 * SSE event senders - REUSES src/types.ts ProcessedResult
 * 56 lines - compliant with ≤75 rule
 */

import { ProcessedResult, SerpResult } from '../../src/types';
import { sendSSE } from './stream';

export const sendInit = async (
  w: WritableStreamDefaultWriter<string>,
  total: number
): Promise<void> => {
  await sendSSE(w, 'init', { totalQueries: total });
};

export const sendQueryStart = async (
  w: WritableStreamDefaultWriter<string>,
  index: number,
  query: string
): Promise<void> => {
  await sendSSE(w, 'query_start', { index, query });
};

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

export const sendProgress = async (
  w: WritableStreamDefaultWriter<string>,
  current: number,
  total: number
): Promise<void> => {
  await sendSSE(w, 'progress', { current, total });
};

export const sendError = async (
  w: WritableStreamDefaultWriter<string>,
  error: string
): Promise<void> => {
  await sendSSE(w, 'error', { error });
};

export const sendComplete = async (
  w: WritableStreamDefaultWriter<string>,
  stats: Record<string, number>
): Promise<void> => {
  await sendSSE(w, 'complete', stats);
};
