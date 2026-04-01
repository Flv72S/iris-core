/**
 * ExecutionSafetyFlag - C.4.C
 * Flag di sicurezza pre-esecuzione. Puramente dichiarativo.
 */

export const EXECUTION_SAFETY_FLAGS = [
  'DIGITAL_WELLBEING_BLOCK',
  'FOCUS_MODE_ACTIVE',
  'MISSING_CAPABILITY',
  'UNSUPPORTED_ACTION',
  'USER_CONFIRMATION_REQUIRED',
] as const;

export type ExecutionSafetyFlag = (typeof EXECUTION_SAFETY_FLAGS)[number];
