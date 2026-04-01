/**
 * AdapterType - C.4.A
 * Tipi di adapter (concetti). Nessuna implementazione.
 */

export const ADAPTER_TYPES = [
  'WHATSAPP',
  'TELEGRAM',
  'EMAIL',
  'VOICE_SYSTEM',
  'LOCAL_AI',
  'CLOUD_AI',
  'SYSTEM_INTERNAL',
] as const;

export type AdapterType = (typeof ADAPTER_TYPES)[number];
