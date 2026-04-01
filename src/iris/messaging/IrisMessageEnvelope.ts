/**
 * IrisMessageEnvelope — IRIS 9.2
 * Contenitore neutro per binding; NON UX. Nessun campo text, title, body, message.
 */

import type { IrisInterpretation } from '../interpretation';
import type { IrisOrchestrationResult } from '../orchestration';

export interface IrisMessageEnvelope {
  readonly channelId: string;
  readonly source: {
    readonly interpretationIds: readonly string[];
    readonly orchestrationPlanIds: readonly string[];
  };
  readonly payload: {
    readonly interpretations: readonly IrisInterpretation[];
    readonly orchestrationResults: readonly IrisOrchestrationResult[];
  };
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly derivedAt: string;
}
