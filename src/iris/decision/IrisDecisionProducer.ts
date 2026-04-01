/**
 * IrisDecisionProducer — IRIS 11.1
 * Interfaccia per produttori di artifact decisionali dichiarativi.
 * NON decide "cosa fare"; NON filtra; NON ha priorità; NON coordina.
 */

import type { IrisInterpretationModel } from '../interpretation';
import type { IrisOrchestrationResult } from '../orchestration';
import type { IrisMessageBinding } from '../messaging';
import type { IrisRenderResult } from '../rendering';
import type { IrisDeliveryResult } from '../delivery';
import type { IrisFeedbackSnapshot } from '../feedback';
import type { IrisDecisionArtifact } from './IrisDecisionArtifact';

export interface IrisDecisionProducerInput {
  readonly interpretationModel?: IrisInterpretationModel;
  readonly orchestrationResults?: readonly IrisOrchestrationResult[];
  readonly messageBindings?: readonly IrisMessageBinding[];
  readonly renderResults?: readonly IrisRenderResult[];
  readonly deliveryResult?: IrisDeliveryResult;
  readonly feedbackSnapshot?: IrisFeedbackSnapshot;
}

export interface IrisDecisionProducer {
  readonly id: string;
  produce(input: IrisDecisionProducerInput): readonly IrisDecisionArtifact[] | null;
}
