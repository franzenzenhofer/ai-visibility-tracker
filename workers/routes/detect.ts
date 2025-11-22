/**
 * Auto-detection route - REUSES src/config-detector.ts
 * 35 lines - compliant with ≤75 rule
 */

import { parseUploadedFile } from '../core/parser';
import { detectConfigFromQueries } from '../../src/config-detector';

export const handleDetect = async (req: Request): Promise<Response> => {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const key = form.get('openaiApiKey') as string | null;

    if (!file) return Response.json({ error: 'No file' }, { status: 400 });
    if (!key) return Response.json({ error: 'API key required' }, { status: 400 });

    // REUSES parser
    const queries = await parseUploadedFile(file);
    if (queries.length === 0) {
      return Response.json({ error: 'No queries found' }, { status: 400 });
    }

    // REUSES config-detector from CLI
    const detected = await detectConfigFromQueries(queries, key, 10);

    return Response.json({
      success: true,
      detected: {
        targetDomain: detected.targetDomain || '',
        userLocation: detected.location || '',
        language: detected.language || 'en',
      },
      totalQueries: queries.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
};
