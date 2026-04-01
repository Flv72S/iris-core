/**
 * Phase 16E — Structured IRIS logger (stdout + optional file append).
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { IrisLog, IrisLogLevel } from './log_types.js';
import { formatLogJson, formatLogPretty } from './log_formatter.js';
import { getActiveTraceContext } from '../tracing/trace_context.js';

const LEVEL_ORDER: Record<IrisLogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type StructuredLoggerOptions = {
  nodeId: string;
  /** Minimum level to emit (inclusive). */
  minLevel: IrisLogLevel;
  /** If true, stdout uses pretty format; otherwise JSON lines. */
  pretty: boolean;
  /** If set, append each line to this file (UTF-8). */
  logFilePath?: string;
  /** Default context for this logger instance. */
  defaultContext?: string;
};

function shouldLog(minLevel: IrisLogLevel, level: IrisLogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function isoNow(): string {
  return new Date().toISOString();
}

export class StructuredIrisLogger {
  constructor(private readonly opts: StructuredLoggerOptions) {}

  private emit(level: IrisLogLevel, message: string, context: string | undefined, metadata?: Record<string, unknown>): void {
    if (!shouldLog(this.opts.minLevel, level)) return;
    const ctx = context ?? this.opts.defaultContext;
    const active = getActiveTraceContext();
    const meta = metadata;
    const explicitTraceId =
      meta && typeof meta.traceId === 'string' && meta.traceId.length > 0 ? meta.traceId : undefined;
    const hasExplicitTraceId = explicitTraceId !== undefined;
    const traceId = explicitTraceId ?? active?.traceId ?? randomUUID();
    const spanId = hasExplicitTraceId
      ? typeof meta?.spanId === 'string' && meta.spanId.length > 0
        ? meta.spanId
        : undefined
      : typeof meta?.spanId === 'string' && meta.spanId.length > 0
        ? meta.spanId
        : active?.spanId;
    const parentSpanId = hasExplicitTraceId
      ? typeof meta?.parentSpanId === 'string' && meta.parentSpanId.length > 0
        ? meta.parentSpanId
        : undefined
      : typeof meta?.parentSpanId === 'string' && meta.parentSpanId.length > 0
        ? meta.parentSpanId
        : active?.parentSpanId;
    const log: IrisLog = {
      timestamp: isoNow(),
      level,
      message,
      traceId,
      ...(spanId ? { spanId } : {}),
      ...(parentSpanId ? { parentSpanId } : {}),
      nodeId: this.opts.nodeId,
      ...(ctx ? { context: ctx } : {}),
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
    };
    const stdoutLine = this.opts.pretty ? formatLogPretty(log) : formatLogJson(log);
    const fileLine = formatLogJson(log);
    if (level === 'error') console.error(stdoutLine);
    else if (level === 'warn') console.warn(stdoutLine);
    else console.log(stdoutLine);
    if (this.opts.logFilePath) {
      try {
        fs.mkdirSync(path.dirname(this.opts.logFilePath), { recursive: true });
        fs.appendFileSync(this.opts.logFilePath, `${fileLine}\n`, 'utf8');
      } catch {
        // avoid crashing on permission errors
      }
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.emit('debug', message, 'debug', metadata);
  }
  info(message: string, metadata?: Record<string, unknown>): void {
    this.emit('info', message, 'node', metadata);
  }
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.emit('warn', message, 'node', metadata);
  }
  error(message: string, metadata?: Record<string, unknown>): void {
    this.emit('error', message, 'node', metadata);
  }
}

export function parseLogLevel(value: string | undefined): IrisLogLevel {
  const v = (value ?? 'info').toLowerCase();
  if (v === 'debug' || v === 'info' || v === 'warn' || v === 'error') return v;
  return 'info';
}
