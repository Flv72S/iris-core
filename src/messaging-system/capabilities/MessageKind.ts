/**
 * MessageKind - C.4.A
 * Tipi di messaggio dichiarativi. Nessun riferimento a canali o esecuzione.
 */

export const MESSAGE_KINDS = [
  'notify',
  'request',
  'confirm',
  'inform',
  'summary',
  'voice',
  'search',
  'gate',
  'index',
  'signal',
] as const;

export type MessageKind = (typeof MESSAGE_KINDS)[number];
