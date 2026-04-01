/**
 * Phase 16E.X4 — Alerting & observability governance.
 */

export type { AlertLevel, AlertCondition, AlertRule, AlertInstance } from './alert_types.js';
export { evaluateCondition } from './alert_rules.js';
export { AlertState } from './alert_state.js';
export { AlertRegistry } from './alert_registry.js';
export { AlertEngine, type AlertEngineOptions } from './alert_engine.js';
export type { AlertAction } from './alert_actions.js';
export { createConsoleAlertAction, createFileAlertAction, AlertActionPipeline } from './alert_actions.js';
export {
  alertRulesPath,
  alertsActivePath,
  loadAlertRules,
  saveAlertRules,
  writeActiveAlertsSnapshot,
  readActiveAlertsSnapshot,
} from './alert_persist.js';
