/**
 * Logging utility with debug mode support
 */
export declare class Logger {
    private debugMode;
    private timers;
    constructor(debugMode?: boolean);
    /**
     * Enable or disable debug mode
     */
    setDebugMode(enabled: boolean): void;
    /**
     * Log request details (only in debug mode)
     */
    logRequest(service: string, model: string, prompt: string, options?: Record<string, unknown>): void;
    /**
     * Log response details (only in debug mode)
     */
    logResponse(service: string, status: string, response: string | null, metadata?: Record<string, unknown>): void;
    /**
     * Log RAW API response (complete JSON object)
     * Uses 'any' intentionally to show complete unfiltered API responses
     */
    logRawResponse(service: string, response: any): void;
    /**
     * Log error details (always logged)
     */
    logError(service: string, error: Error): void;
    /**
     * Log general info (always logged)
     */
    info(message: string): void;
}
export declare const getLogger: () => Logger;
export declare const setGlobalDebugMode: (enabled: boolean) => void;
