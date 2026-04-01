/**
 * DryRunActionType - C.4.D
 * Tipi di azione simulati. Puramente narrativi, nessuna esecuzione.
 */

export const DRY_RUN_ACTION_TYPES = [
  'SEND_MESSAGE',
  'REQUEST_CONFIRMATION',
  'BLOCK_ACTION',
  'INDEX_CONTENT',
  'TRIGGER_AI_PROCESS',
  'NO_OP',
] as const;

export type DryRunActionType = (typeof DRY_RUN_ACTION_TYPES)[number];
