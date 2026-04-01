/**
 * Microstep 16A — IRIS health.
 */

export type IrisHealthStatus = {
  status: 'ok' | 'degraded' | 'error';
  modules: Record<string, 'up' | 'down'>;
};

