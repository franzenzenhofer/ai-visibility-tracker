/**
 * Process route - SSE streaming with REUSED processor
 * 62 lines - compliant with ≤75 rule (refactored)
 */

import { parseUploadedFile } from '../core/parser';
import { loadConfig, validateConfig, ConfigOverrides } from '../core/config';
import { processQuery } from '../core/processor';
import { createSSEStream, closeSSE } from '../sse/stream';
import { sendInit, sendQueryStart, sendQueryComplete, sendProgress, sendError, sendComplete } from '../sse/events';
import { calculateStats, createErrorResult } from '../utils/stats';
import { ProcessedResult } from '../../src/types';

export const handleProcess = async (req: Request): Promise<Response> => {
  const { readable, writer } = createSSEStream();

  (async () => {
    try {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      const openaiKey = form.get('openaiApiKey') as string | null;
      const geminiKey = form.get('geminiApiKey') as string | null;

      if (!file || !openaiKey || !geminiKey) {
        await sendError(writer, 'Missing required fields');
        await closeSSE(writer);
        return;
      }

      const overrides: ConfigOverrides = {
        TARGET_DOMAIN: (form.get('targetDomain') as string) || undefined,
        USER_LOCATION: (form.get('userLocation') as string) || undefined,
        LANGUAGE: (form.get('language') as string) || undefined,
      };

      const config = loadConfig({ OPENAI_API_KEY: openaiKey, GEMINI_API_KEY: geminiKey }, overrides);
      validateConfig(config);

      const queries = await parseUploadedFile(file);
      const limit = parseInt((form.get('queryLimit') as string) || '3', 10);
      const limited = queries.slice(0, limit);

      await sendInit(writer, limited.length);

      const results: ProcessedResult[] = [];
      for (let i = 0; i < limited.length; i++) {
        await sendQueryStart(writer, i, limited[i].query);
        try {
          const result = await processQuery(limited[i], config, writer);
          results.push(result);
          await sendQueryComplete(writer, result);
        } catch (err) {
          results.push(createErrorResult(limited[i].query));
        }
        await sendProgress(writer, i + 1, limited.length);
      }

      await sendComplete(writer, calculateStats(results));
      await closeSSE(writer);
    } catch (err) {
      await sendError(writer, err instanceof Error ? err.message : 'Unknown error');
      await closeSSE(writer);
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
