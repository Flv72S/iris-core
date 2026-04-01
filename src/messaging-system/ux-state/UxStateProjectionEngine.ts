/**
 * UxStateProjectionEngine — C.6
 * Invoca tutti i provider, concatena UxState. NON seleziona, NON ordina. Output frozen.
 */

import type { UxProjectionInput } from './UxProjectionInput';
import type { UxStateSnapshot } from './UxStateSnapshot';
import type { UxState } from './UxState';
import type { UxStateProjectionProvider } from './UxStateProjectionProvider';
import type { UxStateRegistry } from './UxStateKillSwitch';
import { isUxStateProjectionEnabled } from './UxStateKillSwitch';

function derivedAtFromInput(input: UxProjectionInput): number {
  const snap = input.feedbackSnapshot ?? input.actionPlanSnapshot ?? input.contractSnapshot;
  if (snap != null && 'derivedAt' in snap) {
    const d = (snap as { derivedAt: string | number }).derivedAt;
    if (typeof d === 'number') return d;
    const t = new Date(d as string).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

export class UxStateProjectionEngine {
  constructor(private readonly providers: readonly UxStateProjectionProvider[]) {}

  project(input: UxProjectionInput, registry: UxStateRegistry): UxStateSnapshot {
    const derivedAt = derivedAtFromInput(input);

    if (!isUxStateProjectionEnabled(registry)) {
      return Object.freeze({
        states: Object.freeze([]),
        derivedAt,
      });
    }

    const states: UxState[] = [];
    for (const provider of this.providers) {
      const out = provider.project(input);
      if (out != null && out.length > 0) {
        for (const s of out) {
          states.push(
            Object.freeze({
              stateId: s.stateId,
              stateType: s.stateType,
              title: s.title,
              description: s.description,
              severity: s.severity,
              relatedIds:
                s.relatedIds != null ? Object.freeze([...s.relatedIds]) : undefined,
              metadata: s.metadata != null ? Object.freeze({ ...s.metadata }) : undefined,
              derivedAt: s.derivedAt,
            })
          );
        }
      }
    }

    return Object.freeze({
      states: Object.freeze(states),
      derivedAt,
    });
  }
}
