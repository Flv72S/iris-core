/**
 * MessagingCapability - C.4.A
 * Modello dichiarativo. MUST NOT: channelId, adapterId, endpoint, provider, retry, SLA.
 */

import type { MessagingCapabilityType } from './MessagingCapabilityType';
import type { ActionPlanType } from './ActionPlanType';
import type { MessageKind } from './MessageKind';

export interface MessagingCapability {
  readonly capabilityId: string;
  readonly capabilityType: MessagingCapabilityType;
  readonly description: string;
  readonly supportedActionPlanTypes: readonly ActionPlanType[];
  readonly supportedMessageKinds: readonly MessageKind[];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly declaredAt: string;
}
