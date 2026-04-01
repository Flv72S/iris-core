/**
 * S-2 Refinement — Hard (safety) and Soft (operational) invariant types.
 * Deterministic codes and severity; no console, no Date, no async.
 */

export const HardInvariantType = {
  DOUBLE_DELIVERY: 'DOUBLE_DELIVERY',
  DELIVERY_ACROSS_PARTITION: 'DELIVERY_ACROSS_PARTITION',
  GHOST_NODE_RESURRECTION: 'GHOST_NODE_RESURRECTION',
  NEGATIVE_TICK: 'NEGATIVE_TICK',
  SCHEDULER_STARVATION: 'SCHEDULER_STARVATION',
  INFINITE_EVENT_EXPANSION: 'INFINITE_EVENT_EXPANSION',
  QUEUE_OVERFLOW: 'QUEUE_OVERFLOW',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
} as const;

export type HardInvariantType = (typeof HardInvariantType)[keyof typeof HardInvariantType];

export const SoftInvariantType = {
  DELIVERY_TO_DEAD_NODE: 'DELIVERY_TO_DEAD_NODE',
  DELIVERY_DROPPED_BY_PARTITION: 'DELIVERY_DROPPED_BY_PARTITION',
  DELIVERY_DROPPED_BY_CENSORSHIP: 'DELIVERY_DROPPED_BY_CENSORSHIP',
  DELIVERY_DELAYED_BY_ATTACK: 'DELIVERY_DELAYED_BY_ATTACK',
  MESSAGE_SUPPRESSED_BY_POLICY: 'MESSAGE_SUPPRESSED_BY_POLICY',
  NODE_RECOVERY_WITH_PENDING_MESSAGES: 'NODE_RECOVERY_WITH_PENDING_MESSAGES',
  PARTITION_HEAL_WITH_STATE_DIVERGENCE: 'PARTITION_HEAL_WITH_STATE_DIVERGENCE',
  BYZANTINE_MUTATION_APPLIED: 'BYZANTINE_MUTATION_APPLIED',
} as const;

export type SoftInvariantType = (typeof SoftInvariantType)[keyof typeof SoftInvariantType];

export const HARD_SEVERITY: Record<HardInvariantType, number> = Object.freeze({
  [HardInvariantType.DOUBLE_DELIVERY]: 100,
  [HardInvariantType.DELIVERY_ACROSS_PARTITION]: 100,
  [HardInvariantType.GHOST_NODE_RESURRECTION]: 100,
  [HardInvariantType.NEGATIVE_TICK]: 100,
  [HardInvariantType.SCHEDULER_STARVATION]: 90,
  [HardInvariantType.INFINITE_EVENT_EXPANSION]: 100,
  [HardInvariantType.QUEUE_OVERFLOW]: 90,
  [HardInvariantType.INVALID_STATE_TRANSITION]: 100,
});

export const SOFT_SEVERITY: Record<SoftInvariantType, number> = Object.freeze({
  [SoftInvariantType.DELIVERY_TO_DEAD_NODE]: 50,
  [SoftInvariantType.DELIVERY_DROPPED_BY_PARTITION]: 40,
  [SoftInvariantType.DELIVERY_DROPPED_BY_CENSORSHIP]: 40,
  [SoftInvariantType.DELIVERY_DELAYED_BY_ATTACK]: 30,
  [SoftInvariantType.MESSAGE_SUPPRESSED_BY_POLICY]: 30,
  [SoftInvariantType.NODE_RECOVERY_WITH_PENDING_MESSAGES]: 20,
  [SoftInvariantType.PARTITION_HEAL_WITH_STATE_DIVERGENCE]: 30,
  [SoftInvariantType.BYZANTINE_MUTATION_APPLIED]: 40,
});

export interface HardInvariantMeta {
  readonly code: HardInvariantType;
  readonly description: string;
  readonly severity: number;
}

export interface SoftInvariantMeta {
  readonly code: SoftInvariantType;
  readonly description: string;
  readonly severity: number;
}

export const HARD_META: Record<HardInvariantType, HardInvariantMeta> = Object.freeze({
  [HardInvariantType.DOUBLE_DELIVERY]: { code: HardInvariantType.DOUBLE_DELIVERY, description: 'Message delivered twice', severity: HARD_SEVERITY[HardInvariantType.DOUBLE_DELIVERY] },
  [HardInvariantType.DELIVERY_ACROSS_PARTITION]: { code: HardInvariantType.DELIVERY_ACROSS_PARTITION, description: 'Message delivered across partition', severity: HARD_SEVERITY[HardInvariantType.DELIVERY_ACROSS_PARTITION] },
  [HardInvariantType.GHOST_NODE_RESURRECTION]: { code: HardInvariantType.GHOST_NODE_RESURRECTION, description: 'Ghost node resurrection', severity: HARD_SEVERITY[HardInvariantType.GHOST_NODE_RESURRECTION] },
  [HardInvariantType.NEGATIVE_TICK]: { code: HardInvariantType.NEGATIVE_TICK, description: 'Negative tick progression', severity: HARD_SEVERITY[HardInvariantType.NEGATIVE_TICK] },
  [HardInvariantType.SCHEDULER_STARVATION]: { code: HardInvariantType.SCHEDULER_STARVATION, description: 'Scheduler starvation', severity: HARD_SEVERITY[HardInvariantType.SCHEDULER_STARVATION] },
  [HardInvariantType.INFINITE_EVENT_EXPANSION]: { code: HardInvariantType.INFINITE_EVENT_EXPANSION, description: 'Infinite event expansion', severity: HARD_SEVERITY[HardInvariantType.INFINITE_EVENT_EXPANSION] },
  [HardInvariantType.QUEUE_OVERFLOW]: { code: HardInvariantType.QUEUE_OVERFLOW, description: 'Queue overflow', severity: HARD_SEVERITY[HardInvariantType.QUEUE_OVERFLOW] },
  [HardInvariantType.INVALID_STATE_TRANSITION]: { code: HardInvariantType.INVALID_STATE_TRANSITION, description: 'Invalid state transition', severity: HARD_SEVERITY[HardInvariantType.INVALID_STATE_TRANSITION] },
});

export const SOFT_META: Record<SoftInvariantType, SoftInvariantMeta> = Object.freeze({
  [SoftInvariantType.DELIVERY_TO_DEAD_NODE]: { code: SoftInvariantType.DELIVERY_TO_DEAD_NODE, description: 'Delivery attempted to dead node', severity: SOFT_SEVERITY[SoftInvariantType.DELIVERY_TO_DEAD_NODE] },
  [SoftInvariantType.DELIVERY_DROPPED_BY_PARTITION]: { code: SoftInvariantType.DELIVERY_DROPPED_BY_PARTITION, description: 'Message dropped by partition', severity: SOFT_SEVERITY[SoftInvariantType.DELIVERY_DROPPED_BY_PARTITION] },
  [SoftInvariantType.DELIVERY_DROPPED_BY_CENSORSHIP]: { code: SoftInvariantType.DELIVERY_DROPPED_BY_CENSORSHIP, description: 'Message dropped by censorship', severity: SOFT_SEVERITY[SoftInvariantType.DELIVERY_DROPPED_BY_CENSORSHIP] },
  [SoftInvariantType.DELIVERY_DELAYED_BY_ATTACK]: { code: SoftInvariantType.DELIVERY_DELAYED_BY_ATTACK, description: 'Delivery delayed by attack', severity: SOFT_SEVERITY[SoftInvariantType.DELIVERY_DELAYED_BY_ATTACK] },
  [SoftInvariantType.MESSAGE_SUPPRESSED_BY_POLICY]: { code: SoftInvariantType.MESSAGE_SUPPRESSED_BY_POLICY, description: 'Message suppressed by policy', severity: SOFT_SEVERITY[SoftInvariantType.MESSAGE_SUPPRESSED_BY_POLICY] },
  [SoftInvariantType.NODE_RECOVERY_WITH_PENDING_MESSAGES]: { code: SoftInvariantType.NODE_RECOVERY_WITH_PENDING_MESSAGES, description: 'Node recovery with pending messages', severity: SOFT_SEVERITY[SoftInvariantType.NODE_RECOVERY_WITH_PENDING_MESSAGES] },
  [SoftInvariantType.PARTITION_HEAL_WITH_STATE_DIVERGENCE]: { code: SoftInvariantType.PARTITION_HEAL_WITH_STATE_DIVERGENCE, description: 'Partition heal with state divergence', severity: SOFT_SEVERITY[SoftInvariantType.PARTITION_HEAL_WITH_STATE_DIVERGENCE] },
  [SoftInvariantType.BYZANTINE_MUTATION_APPLIED]: { code: SoftInvariantType.BYZANTINE_MUTATION_APPLIED, description: 'Byzantine mutation applied', severity: SOFT_SEVERITY[SoftInvariantType.BYZANTINE_MUTATION_APPLIED] },
});
