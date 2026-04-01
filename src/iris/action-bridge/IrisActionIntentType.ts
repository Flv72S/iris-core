/**
 * IrisActionIntentType — IRIS 12.1
 * Tassonomia dichiarativa degli Action Intent. Descrive l'intenzione, non l'esecuzione.
 * MUST NOT: canali, adapter, delivery.
 */

export const IRIS_ACTION_INTENT_TYPES = [
  'notify',
  'request',
  'confirm',
  'inform',
  'follow_up',
  'escalate',
  'broadcast',
] as const;

export type IrisActionIntentType = (typeof IRIS_ACTION_INTENT_TYPES)[number];
