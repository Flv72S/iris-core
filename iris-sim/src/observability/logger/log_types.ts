/**
 * Phase 16E — Structured log record (strict shape).
 */

export type IrisLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type IrisLog = {
  timestamp: string;
  level: IrisLogLevel;
  message: string;
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  nodeId?: string;
  context?: string;
  metadata?: Record<string, unknown>;
};
