/**
 * AdapterDescriptor - C.4.A
 * Descrittore dichiarativo di un adapter. Concetto, non implementazione.
 */

import type { AdapterType } from './AdapterType';
import type { MessagingCapabilityType } from './MessagingCapabilityType';
import type { MessageKind } from './MessageKind';

export interface AdapterDescriptor {
  readonly adapterId: string;
  readonly adapterType: AdapterType;
  readonly supportedCapabilities: readonly MessagingCapabilityType[];
  readonly supportedMessageKinds: readonly MessageKind[];
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
