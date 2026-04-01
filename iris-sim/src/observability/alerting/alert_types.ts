/**
 * Phase 16E.X4 — Alerting & observability governance types.
 */

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertCondition = {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
};

export type AlertRule = {
  id: string;
  name: string;
  level: AlertLevel;
  condition: AlertCondition;
  cooldownMs?: number;
};

export type AlertInstance = {
  ruleId: string;
  triggeredAt: number;
  resolvedAt?: number;
  value: number;
};
