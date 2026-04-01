/**
 * Execution Guardrails — Fase 7.2
 *
 * Formalizzazione: rate limits, cooldown, budget di azioni, abort conditions.
 * Config immutabili; check deterministici; compatibili con ExecutionGuardrail.
 */

import type { ExecutionAction } from './ExecutionAction';
import type { ExecutionContext } from './ExecutionContext';
import type { ExecutionResult } from './ExecutionResult';
import type { ExecutionGuardrail } from './guardrails/ExecutionGuardrail';

/** Rate limit: massimo N azioni in una finestra temporale. */
export type RateLimitSpec = {
  readonly id: string;
  readonly maxActions: number;
  readonly windowMs: number;
};

/** Cooldown: stessa fonte (es. sourceFeature) non può eseguire di nuovo prima di X ms. */
export type CooldownSpec = {
  readonly id: string;
  readonly cooldownMs: number;
};

/** Budget di azioni: tetto totale di azioni eseguite in una finestra. */
export type ActionBudgetSpec = {
  readonly id: string;
  readonly totalBudget: number;
  readonly windowMs: number;
};

/** Condizione di abort: se il predicato è true, esecuzione bloccata. */
export type AbortConditionSpec = {
  readonly id: string;
  readonly check: (context: ExecutionContext) => boolean;
  readonly reason: string;
};

/** Insieme di specifiche per guardrail. */
export type ExecutionGuardrailSpecs = {
  readonly rateLimit?: RateLimitSpec;
  readonly cooldown?: CooldownSpec;
  readonly actionBudget?: ActionBudgetSpec;
  readonly abortConditions?: readonly AbortConditionSpec[];
};

/**
 * Verifica rate limit: blocca se nella finestra ci sono già maxActions o più.
 */
export function checkRateLimit(
  spec: RateLimitSpec,
  _action: ExecutionAction,
  context: ExecutionContext
): ExecutionResult | null {
  const recent = context.getRecentEntries();
  const since = context.now - spec.windowMs;
  const inWindow = recent.filter((e) => e.requestedAt >= since);
  if (inWindow.length >= spec.maxActions) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: `Rate limit: max ${spec.maxActions} actions per ${spec.windowMs / 1000}s window`,
    });
  }
  return null;
}

/**
 * Verifica cooldown: skip se la stessa sourceFeature ha già eseguito entro cooldownMs.
 */
export function checkCooldown(
  spec: CooldownSpec,
  action: ExecutionAction,
  context: ExecutionContext
): ExecutionResult | null {
  const recent = context.getRecentEntries();
  const since = context.now - spec.cooldownMs;
  const sameSource = recent.filter(
    (e) => e.sourceFeature === action.sourceFeature && e.requestedAt >= since
  );
  const executed = sameSource.filter((e) => e.result.status === 'EXECUTED');
  if (executed.length > 0) {
    return Object.freeze({
      status: 'SKIPPED',
      reason: `Cooldown: ${action.sourceFeature} already executed in last ${spec.cooldownMs / 1000}s`,
    });
  }
  return null;
}

/**
 * Verifica budget: blocca se le azioni eseguite nella finestra hanno già raggiunto il tetto.
 */
export function checkActionBudget(
  spec: ActionBudgetSpec,
  _action: ExecutionAction,
  context: ExecutionContext
): ExecutionResult | null {
  const recent = context.getRecentEntries();
  const since = context.now - spec.windowMs;
  const inWindow = recent.filter((e) => e.requestedAt >= since && e.result.status === 'EXECUTED');
  if (inWindow.length >= spec.totalBudget) {
    return Object.freeze({
      status: 'BLOCKED',
      reason: `Action budget: ${spec.totalBudget} actions per ${spec.windowMs / 1000}s exhausted`,
    });
  }
  return null;
}

/**
 * Verifica condizioni di abort: blocca alla prima condizione vera.
 */
export function checkAbortConditions(
  conditions: readonly AbortConditionSpec[],
  context: ExecutionContext
): ExecutionResult | null {
  for (const c of conditions) {
    if (c.check(context)) {
      return Object.freeze({ status: 'BLOCKED', reason: c.reason });
    }
  }
  return null;
}

/**
 * Crea un ExecutionGuardrail che applica le specifiche in ordine:
 * abort → rate limit → cooldown → action budget. Prima restrizione vince.
 */
export function createGuardrailFromSpecs(specs: ExecutionGuardrailSpecs): ExecutionGuardrail {
  const id = `guardrail-${[specs.rateLimit?.id, specs.cooldown?.id, specs.actionBudget?.id, specs.abortConditions?.map((a) => a.id).join(',')].filter(Boolean).join('-')}`;
  return {
    id,
    check(action: ExecutionAction, context: ExecutionContext): ExecutionResult | null {
      if (specs.abortConditions?.length) {
        const r = checkAbortConditions(specs.abortConditions, context);
        if (r) return r;
      }
      if (specs.rateLimit) {
        const r = checkRateLimit(specs.rateLimit, action, context);
        if (r) return r;
      }
      if (specs.cooldown) {
        const r = checkCooldown(specs.cooldown, action, context);
        if (r) return r;
      }
      if (specs.actionBudget) {
        const r = checkActionBudget(specs.actionBudget, action, context);
        if (r) return r;
      }
      return null;
    },
  };
}

/** Specifiche di default (valori di esempio). */
export const DEFAULT_RATE_LIMIT_SPEC: RateLimitSpec = Object.freeze({
  id: 'rate-limit-default',
  maxActions: 10,
  windowMs: 10 * 60 * 1000,
});

export const DEFAULT_COOLDOWN_SPEC: CooldownSpec = Object.freeze({
  id: 'cooldown-default',
  cooldownMs: 5 * 60 * 1000,
});

export const DEFAULT_ACTION_BUDGET_SPEC: ActionBudgetSpec = Object.freeze({
  id: 'action-budget-default',
  totalBudget: 100,
  windowMs: 24 * 60 * 60 * 1000,
});

/** Condizione di abort: sistema in WELLBEING_BLOCKED. */
export const WELLBEING_ABORT_CONDITION: AbortConditionSpec = Object.freeze({
  id: 'wellbeing-block',
  check: (ctx) => ctx.wellbeingBlocked,
  reason: 'System in WELLBEING_BLOCKED',
});
