/**
 * ActionPlanType — C.4.A
 * Tipi di Action Plan dichiarativi. Nessuna logica di esecuzione.
 */

export const ACTION_PLAN_TYPES = [
  'notify',
  'request',
  'summary',
  'search',
  'prioritize',
  'gate',
  'index',
  'signal',
  'focus',
] as const;

export type ActionPlanType = (typeof ACTION_PLAN_TYPES)[number];
