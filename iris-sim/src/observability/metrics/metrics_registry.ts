/**
 * Phase 16E — In-memory metrics registry (counter + gauge).
 */

import type { MetricsSnapshot } from './metrics_types.js';

const DEFAULT_COUNTERS = ['messages_sent', 'messages_received'] as const;

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();

  constructor() {
    for (const k of DEFAULT_COUNTERS) {
      this.counters.set(k, 0);
    }
  }

  increment(name: string, delta = 1): void {
    const cur = this.counters.get(name) ?? 0;
    this.counters.set(name, cur + delta);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  getGauge(name: string): number | undefined {
    return this.gauges.get(name);
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    for (const k of DEFAULT_COUNTERS) {
      this.counters.set(k, 0);
    }
  }

  exportJson(): MetricsSnapshot {
    const metrics: Record<string, number> = {};
    for (const [k, v] of this.counters.entries()) metrics[k] = v;
    for (const [k, v] of this.gauges.entries()) metrics[k] = v;
    return { generatedAt: new Date().toISOString(), metrics };
  }
}
