/**
 * Phase 16E.X4 — Metrics-driven alert evaluation with cooldown and state.
 */

import type { AlertInstance } from './alert_types.js';
import type { AlertActionPipeline } from './alert_actions.js';
import type { AlertRegistry } from './alert_registry.js';
import { evaluateCondition } from './alert_rules.js';
import type { AlertState } from './alert_state.js';

export type AlertEngineOptions = {
  /** Used when a rule omits `cooldownMs`. Default 60_000. */
  defaultCooldownMs?: number;
  actionPipeline?: AlertActionPipeline;
};

export class AlertEngine {
  private readonly listeners: Array<(alert: AlertInstance) => void> = [];
  private readonly lastEmitAt = new Map<string, number>();

  constructor(
    private readonly registry: AlertRegistry,
    private readonly state: AlertState,
    private readonly options?: AlertEngineOptions,
  ) {}

  onAlert(cb: (alert: AlertInstance) => void): void {
    this.listeners.push(cb);
  }

  /**
   * Evaluate all registered rules against the metric snapshot.
   * Returns instances emitted this cycle (new fires, re-notifications after cooldown, resolutions).
   */
  evaluate(snapshot: Record<string, number>): AlertInstance[] {
    const out: AlertInstance[] = [];
    const now = Date.now();
    const rules = this.registry.getAll();
    const defaultCooldown = this.options?.defaultCooldownMs ?? 60_000;
    const pipeline = this.options?.actionPipeline;

    for (const rule of rules) {
      const raw = snapshot[rule.condition.metric];
      const cooldown = rule.cooldownMs ?? defaultCooldown;

      if (raw === undefined || !Number.isFinite(raw)) {
        if (this.state.isActive(rule.id)) {
          const resolved = this.state.resolve(rule.id, now);
          this.lastEmitAt.delete(rule.id);
          if (resolved) {
            void pipeline?.dispatch(resolved);
            this.notifyListeners(resolved);
            out.push(resolved);
          }
        }
        continue;
      }

      const firing = evaluateCondition(raw, rule.condition);

      if (!firing) {
        if (this.state.isActive(rule.id)) {
          const resolved = this.state.resolve(rule.id, now);
          this.lastEmitAt.delete(rule.id);
          if (resolved) {
            void pipeline?.dispatch(resolved);
            this.notifyListeners(resolved);
            out.push(resolved);
          }
        }
        continue;
      }

      if (!this.state.isActive(rule.id)) {
        const inst: AlertInstance = { ruleId: rule.id, triggeredAt: now, value: raw };
        this.state.activate(inst);
        this.lastEmitAt.set(rule.id, now);
        const cur = this.state.getActive(rule.id)!;
        void pipeline?.dispatch({ ...cur });
        this.notifyListeners({ ...cur });
        out.push({ ...cur });
      } else {
        this.state.updateValue(rule.id, raw);
        const last = this.lastEmitAt.get(rule.id) ?? 0;
        if (now - last >= cooldown) {
          this.lastEmitAt.set(rule.id, now);
          const cur = this.state.getActive(rule.id)!;
          void pipeline?.dispatch({ ...cur });
          this.notifyListeners({ ...cur });
          out.push({ ...cur });
        }
      }
    }

    return out;
  }

  private notifyListeners(alert: AlertInstance): void {
    for (const fn of this.listeners) {
      try {
        fn(alert);
      } catch {
        // ignore
      }
    }
  }
}
