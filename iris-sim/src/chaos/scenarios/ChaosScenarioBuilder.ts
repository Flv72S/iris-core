import type { ChaosEngine } from '../engine/ChaosEngine.js';
import type { ScheduledAttack } from '../engine/ChaosTypes.js';

export class ChaosScenarioBuilder {
  private readonly _chaosEngine: ChaosEngine;
  private readonly _attacks: ScheduledAttack[] = [];

  constructor(chaosEngine: ChaosEngine) {
    this._chaosEngine = chaosEngine;
  }

  addCrashStorm(atTick: bigint, intensityPercent: number): this {
    this._attacks.push({ atTick, kind: 'crash_storm', params: Object.freeze({ intensityPercent }), eventId: 'chaos:cs:' + String(atTick) });
    return this;
  }

  addRecoveryStorm(atTick: bigint, intensityPercent: number): this {
    this._attacks.push({ atTick, kind: 'recovery_storm', params: Object.freeze({ intensityPercent }), eventId: 'chaos:rs:' + String(atTick) });
    return this;
  }

  addPartitionFlap(startTick: bigint, durationTicks: bigint, frequencyTicks: bigint, clusterA: string, clusterB: string): this {
    this._attacks.push({ atTick: startTick, kind: 'partition_flap', params: Object.freeze({ clusterA, clusterB, durationTicks, frequencyTicks }), eventId: 'chaos:flap:' + String(startTick) });
    return this;
  }

  addByzantineSwarm(atTick: bigint, percentage: number): this {
    this._attacks.push({ atTick, kind: 'byzantine_swarm', params: Object.freeze({ intensityPercent: percentage }), eventId: 'chaos:byz:' + String(atTick) });
    return this;
  }

  addFlood(atTick: bigint, fromNodeIds: string[], toNodeIds: string[], messagesPerPair: number): this {
    this._attacks.push({ atTick, kind: 'message_flood', params: Object.freeze({ fromNodeIds, toNodeIds, messagesPerPair, payload: {}, messageType: 'flood' }), eventId: 'chaos:flood:' + String(atTick) });
    return this;
  }

  addSplitBrain(atTick: bigint, durationTicks: bigint, leftClusterIds: string[], rightClusterIds: string[]): this {
    this._attacks.push({ atTick, kind: 'split_brain', params: Object.freeze({ leftClusterIds, rightClusterIds, durationTicks }), eventId: 'chaos:sb:' + String(atTick) });
    return this;
  }

  addTimingManipulation(atTick: bigint, skewFactor: number, durationTicks: bigint): this {
    this._attacks.push({ atTick, kind: 'timing_manipulation', params: Object.freeze({ skewFactor, durationTicks }), eventId: 'chaos:tm:' + String(atTick) });
    return this;
  }

  build(): void {
    for (const a of this._attacks) this._chaosEngine.injectAttack(a);
  }
}
