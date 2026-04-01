/**
 * IrisMessagingEngine — IRIS 9.2
 * Associa snapshot, interpretazioni e risultati orchestrazione a canali.
 * Nessun filtro, nessuna selezione, nessuna trasformazione semantica. NON esegue consegna.
 */

import type { SemanticSnapshot } from '../../semantic-layer';
import type { IrisInterpretationModel } from '../interpretation';
import type { IrisOrchestrationResult } from '../orchestration';
import type { IrisChannel } from './IrisChannel';
import type { IrisMessageBinding } from './IrisMessageBinding';
import type { IrisMessageEnvelope } from './IrisMessageEnvelope';
import type { MessagingRegistry } from './IrisMessagingKillSwitch';
import { isMessagingEnabled } from './IrisMessagingKillSwitch';

export class IrisMessagingEngine {
  constructor(private readonly channels: readonly IrisChannel[]) {}

  /**
   * Crea binding dichiarativi per ogni canale. Include tutte le interpretazioni e tutti i risultati.
   * Se kill-switch OFF restituisce [].
   */
  bind(
    _snapshot: SemanticSnapshot,
    interpretationModel: IrisInterpretationModel,
    orchestrationResults: readonly IrisOrchestrationResult[],
    registry: MessagingRegistry
  ): readonly IrisMessageBinding[] {
    if (!isMessagingEnabled(registry)) {
      return Object.freeze([]);
    }
    const bindings: IrisMessageBinding[] = [];
    const interpretationIds = interpretationModel.interpretations.map((i) => i.id);
    const orchestrationPlanIds = orchestrationResults.map((r) => r.planId);
    const payload = Object.freeze({
      interpretations: Object.freeze([...interpretationModel.interpretations]),
      orchestrationResults: Object.freeze([...orchestrationResults]),
    });
    const source = Object.freeze({
      interpretationIds: Object.freeze([...interpretationIds]),
      orchestrationPlanIds: Object.freeze([...orchestrationPlanIds]),
    });
    const derivedAt = new Date().toISOString();

    for (const channel of this.channels) {
      const envelope: IrisMessageEnvelope = Object.freeze({
        channelId: channel.id,
        source,
        payload,
        derivedAt,
      });
      bindings.push(
        Object.freeze({
          channel,
          envelope,
        })
      );
    }
    return Object.freeze(bindings);
  }
}
