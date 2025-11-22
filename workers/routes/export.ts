/**
 * Export route - delegates to export modules
 * 28 lines - compliant with ≤75 rule
 */

import { ProcessedResult } from '../../src/types';
import { buildCSVResponse } from '../export/csv';
import { buildExcelResponse } from '../export/excel';
import { buildJSONResponse } from '../export/json';

export const handleExport = async (req: Request): Promise<Response> => {
  try {
    const body = await req.json() as { results?: unknown; format?: string };
    const { results, format } = body;

    if (!results || !Array.isArray(results)) {
      return Response.json({ error: 'Invalid results' }, { status: 400 });
    }

    switch (format) {
      case 'csv':
        return buildCSVResponse(results as ProcessedResult[]);
      case 'xlsx':
        return buildExcelResponse(results as ProcessedResult[]);
      case 'json':
        return buildJSONResponse(results as ProcessedResult[]);
      default:
        return Response.json({ error: 'Invalid format' }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: msg }, { status: 500 });
  }
};
