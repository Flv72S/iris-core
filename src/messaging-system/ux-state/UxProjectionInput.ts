/**
 * UxProjectionInput — C.6
 * Input di sola lettura: solo snapshot esistenti. NO Engine, NO Adapter, NO Execution Call.
 */

import type { IrisDecisionSelectionSnapshot } from '../../iris/decision/IrisDecisionSelectionSnapshot';
import type { IrisActionIntentSnapshot } from '../../iris/action-bridge/IrisActionIntentSnapshot';
import type { MessagingContractSnapshot } from '../contract/MessagingContractSnapshot';
import type { ActionPlanSnapshot } from '../action-plan/ActionPlanSnapshot';
import type { ExecutionResultSnapshot } from '../feedback/ExecutionResultSnapshot';
import type { ExecutionFeedbackSnapshot } from '../feedback/ExecutionFeedbackSnapshot';

export interface UxProjectionInput {
  readonly decisionSelectionSnapshot?: IrisDecisionSelectionSnapshot;
  readonly actionIntentSnapshot?: IrisActionIntentSnapshot;
  readonly contractSnapshot?: MessagingContractSnapshot;
  readonly actionPlanSnapshot?: ActionPlanSnapshot;
  readonly executionResultSnapshot?: ExecutionResultSnapshot;
  readonly feedbackSnapshot?: ExecutionFeedbackSnapshot;
}
