/**
 * IrisCapability — C.1.5
 * Tipo dichiarativo: cosa il sistema può fare. Non come, non quando, non con quali adapter.
 * MUST NOT: action, execute, adapter, channel, priority, score, model, provider.
 */

import type { IrisCapabilityType } from './IrisCapabilityType';

export interface IrisCapability {
  readonly capabilityId: string;
  readonly capabilityType: IrisCapabilityType;
  readonly description: string;
  readonly inputs?: readonly string[];
  readonly outputs?: readonly string[];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
