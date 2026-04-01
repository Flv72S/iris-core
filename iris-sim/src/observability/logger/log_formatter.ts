/**
 * Phase 16E — JSON vs human-readable formatting.
 */

import type { IrisLog } from './log_types.js';

export function formatLogJson(log: IrisLog): string {
  return JSON.stringify(log);
}

export function formatLogPretty(log: IrisLog): string {
  const meta = log.metadata && Object.keys(log.metadata).length > 0 ? ` ${JSON.stringify(log.metadata)}` : '';
  const ctx = log.context ? `[${log.context}] ` : '';
  const nid = log.nodeId ? ` ${log.nodeId}` : '';
  const trace = ` trace=${log.traceId}${log.spanId ? ` span=${log.spanId}` : ''}${log.parentSpanId ? ` parent=${log.parentSpanId}` : ''}`;
  return `${log.timestamp} ${log.level.toUpperCase()} ${ctx}${log.message}${nid}${trace}${meta}`;
}
