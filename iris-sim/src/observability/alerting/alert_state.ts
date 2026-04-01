/**
 * Phase 16E.X4 — Active alert tracking (one open instance per rule id).
 */

import type { AlertInstance } from './alert_types.js';

export class AlertState {
  private readonly active = new Map<string, AlertInstance>();

  isActive(ruleId: string): boolean {
    return this.active.has(ruleId);
  }

  getActive(ruleId: string): AlertInstance | undefined {
    const a = this.active.get(ruleId);
    return a ? { ...a } : undefined;
  }

  getAllActive(): AlertInstance[] {
    return [...this.active.values()]
      .map((a) => ({ ...a }))
      .sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  }

  /** Open a new alert (caller ensures no duplicate open for same rule). */
  activate(inst: AlertInstance): void {
    this.active.set(inst.ruleId, { ...inst });
  }

  updateValue(ruleId: string, value: number): void {
    const cur = this.active.get(ruleId);
    if (cur) {
      this.active.set(ruleId, { ...cur, value });
    }
  }

  /**
   * Mark resolved and remove from active set.
   * @returns A copy of the resolved instance, or undefined if none was active.
   */
  resolve(ruleId: string, resolvedAt: number): AlertInstance | undefined {
    const cur = this.active.get(ruleId);
    if (!cur) return undefined;
    const done: AlertInstance = { ...cur, resolvedAt };
    this.active.delete(ruleId);
    return done;
  }

  clear(): void {
    this.active.clear();
  }
}
