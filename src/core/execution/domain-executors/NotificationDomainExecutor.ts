/**
 * NotificationDomainExecutor — Esecutore dominio notifiche.
 * Delega all'adapter esistente; azione atomica; nessuna decisione autonoma.
 */

import type { DomainExecutor } from './DomainExecutor';
import type { ActionIntent } from '../action-intent';
import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionResult } from '../ExecutionResult';
import { notificationAdapter } from '../adapters/NotificationAdapter';

export const notificationDomainExecutor: DomainExecutor = Object.freeze({
  actionType: 'SEND_NOTIFICATION',
  execute(intent: ActionIntent, now: number): ExecutionResult {
    const action: ExecutionAction = Object.freeze({
      id: intent.intentId,
      type: 'SEND_NOTIFICATION',
      payload: intent.payload,
      requestedAt: intent.requestedAt,
      sourceFeature: intent.sourceFeature,
    });
    return notificationAdapter.execute(action, now);
  },
});
