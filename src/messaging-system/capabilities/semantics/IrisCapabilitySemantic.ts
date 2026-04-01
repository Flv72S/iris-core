/**
 * IrisCapabilitySemantic — C.1.6
 * Significato strutturato di una capability. Meaning, not behavior.
 * MUST NOT: execute, action, score, priority, adapter, channel, model, provider.
 */

import type { IrisCapabilityType } from '../IrisCapabilityType';
import type { IrisCapabilityDomain } from './IrisCapabilityDomain';
import type { IrisIntentCategory } from './IrisIntentCategory';

export interface IrisCapabilitySemantic {
  readonly semanticId: string;
  readonly capabilityType: IrisCapabilityType;
  readonly domain: IrisCapabilityDomain;
  readonly intentCategory: IrisIntentCategory;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly effects: readonly string[];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
