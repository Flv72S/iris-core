/**
 * Phase 16E.X1.FIX — Canonical Prometheus metric definitions (strict, no runtime heuristics).
 */

export type MetricDefinition = {
  /** Prometheus exposition name (e.g. iris_messages_sent_total). */
  name: string;
  type: 'counter' | 'gauge';
  help: string;
};

/**
 * Registry keyed by internal IRIS metric keys (as produced by MetricsRegistry / persistence).
 * Every exported series MUST have an entry here; unknown keys are skipped at export time.
 */
export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  messages_sent: {
    name: 'iris_messages_sent_total',
    type: 'counter',
    help: 'Total number of messages sent',
  },
  messages_received: {
    name: 'iris_messages_received_total',
    type: 'counter',
    help: 'Total number of messages received',
  },
  active_sessions: {
    name: 'iris_active_sessions',
    type: 'gauge',
    help: 'Number of active sessions',
  },
  node_uptime_seconds: {
    name: 'iris_node_uptime_seconds',
    type: 'gauge',
    help: 'Node uptime in seconds',
  },
};

function assertUniquePrometheusNames(): void {
  const seen = new Map<string, string>();
  for (const [internalKey, def] of Object.entries(METRIC_DEFINITIONS)) {
    const prev = seen.get(def.name);
    if (prev !== undefined) {
      throw new Error(
        `[IRIS Prometheus] Duplicate Prometheus metric name "${def.name}" for internal keys "${prev}" and "${internalKey}"`,
      );
    }
    seen.set(def.name, internalKey);
  }
}

assertUniquePrometheusNames();
