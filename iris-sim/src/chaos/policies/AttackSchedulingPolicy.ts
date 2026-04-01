/**
 * S-2 — Attack scheduling policy. Deterministic ordering.
 */

import type { ScheduledAttack } from '../engine/ChaosTypes.js';

export interface AttackSchedulingPolicy {
  readonly attacks: readonly ScheduledAttack[];
  add(attack: ScheduledAttack): AttackSchedulingPolicy;
}

export function createAttackSchedulingPolicy(attacks: ScheduledAttack[] = []): AttackSchedulingPolicy {
  const list: ScheduledAttack[] = [...attacks];
  return {
    get attacks() {
      return list.slice();
    },
    add(attack: ScheduledAttack) {
      list.push(attack);
      return createAttackSchedulingPolicy(list);
    },
  };
}
