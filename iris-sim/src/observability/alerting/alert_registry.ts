/**
 * Phase 16E.X4 — Mutable rule registry.
 */

import type { AlertRule } from './alert_types.js';

export class AlertRegistry {
  private readonly rules = new Map<string, AlertRule>();

  register(rule: AlertRule): void {
    this.rules.set(rule.id, { ...rule });
  }

  unregister(id: string): boolean {
    return this.rules.delete(id);
  }

  get(id: string): AlertRule | undefined {
    const r = this.rules.get(id);
    return r ? { ...r } : undefined;
  }

  getAll(): AlertRule[] {
    return [...this.rules.values()]
      .map((r) => ({ ...r }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  clear(): void {
    this.rules.clear();
  }
}
