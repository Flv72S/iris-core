/**
 * IrisCapabilityType — C.1.5
 * Tassonomia controllata delle capability (namespace.type).
 * MUST NOT: canali, provider, model, retry, SLA.
 */

export const IRIS_CAPABILITY_TYPES = [
  'summarize.text',
  'summarize.voice',
  'transcribe.voice',
  'semantic.search',
  'memory.store',
  'memory.retrieve',
  'attention.filter',
  'attention.observe',
  'intent.suggest',
  'social.observe',
  'delivery.defer',
  'context.link',
] as const;

export type IrisCapabilityType = (typeof IRIS_CAPABILITY_TYPES)[number];
