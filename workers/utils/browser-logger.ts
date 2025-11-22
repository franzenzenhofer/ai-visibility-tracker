/**
 * Browser-compatible logger - REUSES src/logger.ts Logger class pattern
 * 40 lines - compliant with ≤75 rule
 */

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'request' | 'response' | 'sse';
  service?: string;
  message: string;
  data?: unknown;
  elapsed?: number;
}

export class BrowserLogger {
  private logs: LogEntry[] = [];
  private timers: Map<string, number> = new Map();

  log(level: LogEntry['level'], message: string, data?: unknown, service?: string): void {
    this.logs.push({ timestamp: Date.now(), level, message, data, service });
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  }

  startTimer(key: string): void {
    this.timers.set(key, Date.now());
  }

  endTimer(key: string): number | null {
    const start = this.timers.get(key);
    if (!start) return null;
    const elapsed = Date.now() - start;
    this.timers.delete(key);
    return elapsed;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
    this.timers.clear();
  }
}
