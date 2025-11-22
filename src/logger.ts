/**
 * Logging utility with debug mode support + optional SSE streaming
 */

// Type definitions for SSE sender functions (avoids cross-directory import)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SseSenderFn = (writer: WritableStreamDefaultWriter<string>, service: string, ...args: any[]) => Promise<void>;

export class Logger {
  private debugMode: boolean;
  private timers: Map<string, number>;
  private sseWriter: WritableStreamDefaultWriter<string> | null = null;
  private sseSenders: { sendApiRequest: SseSenderFn; sendApiResponse: SseSenderFn } | null = null;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.timers = new Map();
  }

  setSseWriter(writer: WritableStreamDefaultWriter<string> | null, senders?: { sendApiRequest: SseSenderFn; sendApiResponse: SseSenderFn }): void {
    this.sseWriter = writer;
    this.sseSenders = senders || null;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Log request details (only in debug mode) + optional SSE
   */
  logRequest(service: string, model: string, prompt: string, options?: Record<string, unknown>): void {
    // Start timer for this request
    this.timers.set(service, Date.now());

    // Send SSE event if writer available
    if (this.sseWriter && this.sseSenders) {
      this.sseSenders.sendApiRequest(this.sseWriter, service, model, prompt).catch(() => {});
    }

    if (!this.debugMode) return;

    console.log('\n' + '='.repeat(80));
    console.log(`📤 REQUEST TO ${service.toUpperCase()} [${model}]`);
    console.log('='.repeat(80));
    console.log('PROMPT:');
    console.log(prompt);

    if (options) {
      console.log('\nOPTIONS:');
      console.log(JSON.stringify(options, null, 2));
    }
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Log response details (only in debug mode) + optional SSE
   */
  logResponse(service: string, status: string, response: string | null, metadata?: Record<string, unknown>): void {
    // Calculate elapsed time
    const startTime = this.timers.get(service);
    const elapsed = startTime ? Date.now() - startTime : null;
    this.timers.delete(service);

    // Send SSE event if writer available
    if (this.sseWriter && this.sseSenders) {
      this.sseSenders.sendApiResponse(this.sseWriter, service, response, elapsed || undefined).catch(() => {});
    }

    if (!this.debugMode) return;

    console.log('\n' + '='.repeat(80));
    console.log(`📥 RESPONSE FROM ${service.toUpperCase()} [${status}]`);
    if (elapsed !== null) {
      console.log(`⏱️  Time: ${elapsed}ms`);
    }
    console.log('='.repeat(80));

    if (response) {
      console.log('RESPONSE:');
      console.log(response);
    } else {
      console.log('RESPONSE: null/empty');
    }

    if (metadata) {
      console.log('\nMETADATA:');
      console.log(JSON.stringify(metadata, null, 2));
    }
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Log RAW API response (complete JSON object)
   * Uses 'any' intentionally to show complete unfiltered API responses
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logRawResponse(service: string, response: any): void {
    if (!this.debugMode) return;

    console.log('\n' + '━'.repeat(80));
    console.log(`🔬 RAW API RESPONSE FROM ${service.toUpperCase()}`);
    console.log('━'.repeat(80));
    console.log('COMPLETE JSON OBJECT:');
    console.log(JSON.stringify(response, null, 2));
    console.log('━'.repeat(80) + '\n');
  }

  /**
   * Log error details (always logged) + optional SSE
   */
  logError(service: string, error: Error): void {
    // Send SSE event if writer available
    if (this.sseWriter && this.sseSenders) {
      this.sseSenders.sendApiResponse(this.sseWriter, service, `ERROR: ${error.message}`, undefined).catch(() => {});
    }

    console.error(`\n❌ ERROR in ${service}:`);
    console.error(error.message);

    if (this.debugMode && error.stack) {
      console.error('\nSTACK TRACE:');
      console.error(error.stack);
    }
  }

  /**
   * Log general info (always logged)
   */
  info(message: string): void {
    console.log(message);
  }
}

// Global logger instance
let globalLogger = new Logger(false);

export const getLogger = (): Logger => globalLogger;

export const setGlobalDebugMode = (enabled: boolean): void => {
  globalLogger.setDebugMode(enabled);
};
