/**
 * UxStateType — C.6
 * Tipi di stato UX controllati ed estensibili. Solo lettura.
 */

export const UX_STATE_TYPES = [
  'INFO',
  'SUMMARY_AVAILABLE',
  'VOICE_READY',
  'ACTION_PENDING',
  'WAITING_REPLY',
  'FOCUS_ACTIVE',
  'WELLBEING_BLOCK',
  'DELIVERY_FAILED',
  'DELIVERY_SUCCESS',
  'SYSTEM_NOTICE',
] as const;

export type UxStateType = (typeof UX_STATE_TYPES)[number];
