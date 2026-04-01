/**
 * IRIS 9.2 — Messaging & Channel Binding
 * Binding dichiarativo verso canali; prepara consegna, NON esegue. Nessuna UX, nessuna decisione.
 */

export type { IrisChannel } from './IrisChannel';
export type { IrisMessageEnvelope } from './IrisMessageEnvelope';
export type { IrisMessageBinding } from './IrisMessageBinding';
export {
  IRIS_MESSAGING_COMPONENT_ID,
  isMessagingEnabled,
  type MessagingRegistry,
} from './IrisMessagingKillSwitch';
export { IrisMessagingEngine } from './IrisMessagingEngine';
