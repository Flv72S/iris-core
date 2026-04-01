/**
 * Phase 16E — Build observability stack from config + environment.
 * Microstep 16E.FINAL — unified feature flags (enabled + per-layer).
 */

import path from 'node:path';

import type { IrisConfig } from '../sdk/iris_config.js';
import { StructuredIrisLogger, parseLogLevel } from './logger/iris_logger.js';
import { MetricsRegistry } from './metrics/metrics_registry.js';
import { Tracer } from './tracing/tracer.js';
import { ObservabilityBridge } from './events/observability_bridge.js';

export type ResolvedObservability = {
  disabled: boolean;
  flags: { logging: boolean; metrics: boolean; tracing: boolean; alerting: boolean };
  cwd: string;
  pretty: boolean;
  logLevel: ReturnType<typeof parseLogLevel>;
  logger: StructuredIrisLogger | null;
  metrics: MetricsRegistry | null;
  tracer: Tracer | null;
  bridge: ObservabilityBridge | null;
};

function envObsDisabled(): boolean {
  const v = process.env.IRIS_OBSERVABILITY;
  return v === '0' || v === 'false' || v === 'FALSE';
}

export function resolveObservability(
  config: Partial<IrisConfig> | undefined,
  opts: { cwd: string; nodeId: string },
): ResolvedObservability {
  const cwd = config?.observability?.cwd ?? opts.cwd;
  const nodeId = opts.nodeId;

  if (envObsDisabled() || config?.observability?.enabled === false) {
    return {
      disabled: true,
      flags: { logging: false, metrics: false, tracing: false, alerting: false },
      cwd,
      pretty: false,
      logLevel: 'info',
      logger: null,
      metrics: null,
      tracer: null,
      bridge: null,
    };
  }

  const o = config?.observability;
  const metricsOn = o?.metrics ?? true;
  const tracingOn = o?.tracing ?? true;
  const alertingOn = metricsOn && (o?.alerting ?? true);
  const flags = {
    logging: o?.logging ?? true,
    metrics: metricsOn,
    tracing: tracingOn,
    alerting: alertingOn,
  };
  const pretty = o?.pretty ?? false;
  const logLevel = parseLogLevel(process.env.IRIS_LOG_LEVEL ?? o?.logLevel);

  const logFilePath = flags.logging ? path.join(cwd, '.iris', 'iris.log') : undefined;

  const logger = flags.logging
    ? new StructuredIrisLogger({
        nodeId,
        minLevel: logLevel,
        pretty,
        ...(logFilePath ? { logFilePath } : {}),
        defaultContext: 'node',
      })
    : null;

  const metrics = flags.metrics ? new MetricsRegistry() : null;
  const tracer = flags.tracing ? new Tracer() : null;

  const bridge =
    logger || metrics || tracer
      ? new ObservabilityBridge({
          nodeId,
          flags: {
            logging: Boolean(logger),
            metrics: Boolean(metrics),
            tracing: Boolean(tracer),
          },
          logger,
          metrics,
          tracer,
        })
      : null;

  return {
    disabled: false,
    flags,
    cwd,
    pretty,
    logLevel,
    logger,
    metrics,
    tracer,
    bridge,
  };
}
