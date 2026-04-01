/**
 * IrisExecutionCapability — IRIS 12.3
 * Modello dichiarativo di capability per Messaging System / Execution Engine esterni.
 * IRIS osserva la compatibilità, NON decide.
 */

import type { IrisActionIntentType } from '../action-bridge';

export interface IrisExecutionCapability {
  readonly capabilityId: string;
  readonly supportedIntentTypes: readonly IrisActionIntentType[];
  readonly supportedConstraints?: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
