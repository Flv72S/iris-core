/**
 * Capability - Security Boundary Layer
 * Microstep 5.4.1
 */

export type { PluginCapability, PluginCapabilitySet } from './PluginCapability';
export { hasCapability, requireCapability } from './PluginCapability';
export {
  capabilityAllowed,
  capabilityDenied,
  isCapabilityAllowed,
  type CapabilityDecision,
} from './CapabilityDecision';
export type { CapabilityPolicy } from './CapabilityPolicy';
export { CapabilityGovernance } from './CapabilityGovernance';
