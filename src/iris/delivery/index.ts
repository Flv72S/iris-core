/**
 * IRIS 10.1 — Delivery / Execution
 * Adatta contenuti renderizzati verso sistemi esterni. Esegue ciò che gli viene passato; non decide.
 */

export type { IrisDeliveryAdapter } from './IrisDeliveryAdapter';
export type { IrisDeliveryOutcome, IrisDeliveryStatus } from './IrisDeliveryOutcome';
export type { IrisDeliveryResult } from './IrisDeliveryResult';
export {
  IRIS_DELIVERY_COMPONENT_ID,
  isDeliveryEnabled,
  type DeliveryRegistry,
} from './IrisDeliveryKillSwitch';
export { IrisDeliveryEngine } from './IrisDeliveryEngine';
