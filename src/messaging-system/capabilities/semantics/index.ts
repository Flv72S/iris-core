/**
 * Messaging System — Capability Semantics (C.1.6)
 * Significato strutturato delle capability. Meaning, not execution.
 */

export { IRIS_CAPABILITY_DOMAINS, type IrisCapabilityDomain } from './IrisCapabilityDomain';
export { IRIS_INTENT_CATEGORIES, type IrisIntentCategory } from './IrisIntentCategory';
export type { IrisCapabilitySemantic } from './IrisCapabilitySemantic';
export type { IrisCapabilitySemanticSnapshot } from './IrisCapabilitySemanticSnapshot';
export {
  IRIS_CAPABILITY_SEMANTIC_COMPONENT_ID,
  isCapabilitySemanticEnabled,
  type IrisCapabilitySemanticRegistry,
} from './IrisCapabilitySemanticRegistry';
export { IrisCapabilitySemanticEngine } from './IrisCapabilitySemanticEngine';
