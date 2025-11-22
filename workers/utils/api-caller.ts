/**
 * Unified API call wrapper - DRY error handling for ALL AI calls
 * Ensures one failing call doesn't break others in Promise.all()
 * Handles nullable returns and converts to defaultValue
 */

import { getLogger } from '../../src/logger';

export interface ApiCall<T> {
  name: string;
  execute: () => Promise<T | null>;
  defaultValue: T;
}

/**
 * Executes API call with guaranteed error handling and null-safety
 * Returns defaultValue on error OR null result
 */
export const safeApiCall = async <T>(call: ApiCall<T>): Promise<T> => {
  const logger = getLogger();

  try {
    const result = await call.execute();
    return result ?? call.defaultValue;
  } catch (error) {
    logger.logError(call.name, error as Error);
    return call.defaultValue;
  }
};

/**
 * Executes multiple API calls in parallel with guaranteed execution
 * One failing call will NOT break others
 */
export const parallelApiCalls = async <T>(calls: ApiCall<T>[]): Promise<T[]> => {
  return Promise.all(calls.map(call => safeApiCall(call)));
};
