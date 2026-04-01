/**
 * Tipi locali per Feature Eligibility. Non equivale ad attivazione o execution.
 */

export type FeatureId = string;

export type UxStateType =
  | 'FOCUS_ACTIVE'
  | 'WELLBEING_BLOCK'
  | 'OVERLOADED'
  | 'WAITING_REPLY'
  | 'ACTION_PENDING';
