/**
 * InboxDomainExecutor — BLOCK_INPUT e DEFER_MESSAGE. Azione atomica.
 */

import type { DomainExecutor } from './DomainExecutor';
import type { ActionIntent } from '../action-intent';
import type { ExecutionAction } from '../ExecutionAction';
import { blockInputAdapter, deferMessageAdapter } from '../adapters/InboxAdapter';

function makeExecutor(
  actionType: 'BLOCK_INPUT' | 'DEFER_MESSAGE',
  adapter: { execute(action: ExecutionAction, now: number): import('../ExecutionResult').ExecutionResult }
): DomainExecutor {
  return Object.freeze({
    actionType,
    execute(intent: ActionIntent, now: number) {
      const action: ExecutionAction = Object.freeze({
        id: intent.intentId,
        type: actionType,
        payload: intent.payload,
        requestedAt: intent.requestedAt,
        sourceFeature: intent.sourceFeature,
      });
      return adapter.execute(action, now);
    },
  });
}

export const blockInputDomainExecutor: DomainExecutor = makeExecutor('BLOCK_INPUT', blockInputAdapter);
export const deferMessageDomainExecutor: DomainExecutor = makeExecutor('DEFER_MESSAGE', deferMessageAdapter);
