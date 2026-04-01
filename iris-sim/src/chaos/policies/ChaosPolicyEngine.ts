/**
 * S-2 — Chaos policy engine. Combines attacks; deterministic scheduling.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';
import type { ChaosConfig } from '../engine/ChaosConfig.js';
import type { ScheduledAttack } from '../engine/ChaosTypes.js';
import { scheduleCrashStorm } from '../attacks/CrashStormAttack.js';
import { scheduleRecoveryStorm } from '../attacks/RecoveryStormAttack.js';
import { schedulePartitionFlap } from '../attacks/PartitionFlapAttack.js';
import { scheduleByzantineSwarm } from '../attacks/ByzantineSwarmAttack.js';
import { scheduleMessageFlood } from '../attacks/MessageFloodAttack.js';
import { scheduleSplitBrain } from '../attacks/SplitBrainAttack.js';
import { scheduleTimingManipulation } from '../attacks/TimingManipulationAttack.js';

export function applyScheduledAttack(
  engine: GlobalSimulationEngine,
  attack: ScheduledAttack,
  config: ChaosConfig,
  rng: { nextInt: (n: number) => number },
  eventIdPrefix: string,
): void {
  const params = attack.params as Record<string, unknown>;
  switch (attack.kind) {
    case 'crash_storm':
      if (config.allowCrashStorm) scheduleCrashStorm(engine, attack.atTick, { intensityPercent: params.intensityPercent as number, clusterIds: params.clusterIds as string[] }, rng, eventIdPrefix);
      break;
    case 'recovery_storm':
      scheduleRecoveryStorm(engine, attack.atTick, { intensityPercent: params.intensityPercent as number, clusterIds: params.clusterIds as string[] }, rng, eventIdPrefix);
      break;
    case 'partition_flap':
      if (config.allowPartitionFlap) schedulePartitionFlap(engine, attack.atTick, params as { clusterA: string; clusterB: string; durationTicks: bigint; frequencyTicks: bigint }, eventIdPrefix);
      break;
    case 'byzantine_swarm':
      if (config.allowByzantineSwarm) scheduleByzantineSwarm(engine, attack.atTick, { intensityPercent: params.intensityPercent as number, clusterIds: params.clusterIds as string[] }, rng, eventIdPrefix);
      break;
    case 'message_flood':
      if (config.allowFloodAttack) scheduleMessageFlood(engine, attack.atTick, params as unknown as Parameters<typeof scheduleMessageFlood>[2], rng, eventIdPrefix);
      break;
    case 'split_brain':
      if (config.allowSplitBrain) scheduleSplitBrain(engine, attack.atTick, params as { leftClusterIds: string[]; rightClusterIds: string[]; durationTicks: bigint }, eventIdPrefix);
      break;
    case 'timing_manipulation':
      if (config.allowTimingManipulation) scheduleTimingManipulation(engine, attack.atTick, params as { skewFactor: number; durationTicks: bigint }, eventIdPrefix);
      break;
    default:
      break;
  }
}
