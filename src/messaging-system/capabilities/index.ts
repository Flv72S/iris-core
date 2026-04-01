/**
 * Messaging System — Capability Model (C.1.5)
 * Layer dichiarativo: cosa il sistema può fare. Non come, non quando, non adapter.
 */

export { IRIS_CAPABILITY_TYPES, type IrisCapabilityType } from './IrisCapabilityType';
export type { IrisCapability } from './IrisCapability';
export type { IrisCapabilitySnapshot } from './IrisCapabilitySnapshot';
export {
  IRIS_CAPABILITY_COMPONENT_ID,
  isCapabilityModelEnabled,
  type IrisCapabilityRegistry,
} from './IrisCapabilityRegistry';
export { IrisCapabilityEngine } from './IrisCapabilityEngine';

/** C.4.A - Adapter Capability Matrix */
export { MESSAGE_KINDS, type MessageKind } from './MessageKind';
export { ACTION_PLAN_TYPES, type ActionPlanType } from './ActionPlanType';
export { MESSAGING_CAPABILITY_TYPES, type MessagingCapabilityType } from './MessagingCapabilityType';
export type { MessagingCapability } from './MessagingCapability';
export { ADAPTER_TYPES, type AdapterType } from './AdapterType';
export type { AdapterDescriptor } from './AdapterDescriptor';
export type { AdapterCapabilityMatrix } from './AdapterCapabilityMatrix';
export { MessagingCapabilityRegistry } from './MessagingCapabilityRegistry';
