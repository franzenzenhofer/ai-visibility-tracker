/**
 * Main Worker entry point - Router only
 * 38 lines - compliant with ≤75 rule
 */

import { handleDetect } from './routes/detect';
import { handleProcess } from './routes/process';
import { handleExport } from './routes/export';

export interface Env {
  ASSETS?: Fetcher;
}

const handleCORS = (): Response => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return handleCORS();

    const url = new URL(req.url);

    // API routes
    if (url.pathname === '/api/detect') return handleDetect(req);
    if (url.pathname === '/api/process') return handleProcess(req);
    if (url.pathname === '/api/export') return handleExport(req);
    if (url.pathname === '/api/version') {
      return new Response(JSON.stringify({
        version: '2.2.0',
        deployedAt: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Static files (served by Wrangler's assets)
    if (env.ASSETS) return env.ASSETS.fetch(req);

    return new Response('Not Found', { status: 404 });
  },
};
