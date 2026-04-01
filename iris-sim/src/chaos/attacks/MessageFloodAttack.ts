/**
 * S-2 — Message flood. Scheduler pressure test.
 */

import type { GlobalSimulationEngine } from '../../simulation/engine/GlobalSimulationEngine.js';

export interface MessageFloodParams {
  readonly fromNodeIds: readonly string[];
  readonly toNodeIds: readonly string[];
  readonly messagesPerPair: number;
  readonly payload: unknown;
  readonly messageType: string;
}

export function scheduleMessageFlood(
  engine: GlobalSimulationEngine,
  atTick: bigint,
  params: MessageFloodParams,
  rng: { nextInt: (n: number) => number },
  eventIdPrefix: string,
): void {
  const pairs: [string, string][] = [];
  for (const from of params.fromNodeIds) {
    for (const to of params.toNodeIds) {
      if (from !== to) for (let i = 0; i < params.messagesPerPair; i++) pairs.push([from, to]);
    }
  }
  for (let i = 0; i < pairs.length; i++) {
    const idx = i + (pairs.length - i > 1 ? rng.nextInt(pairs.length - i) : 0);
    const t = pairs[i];
    pairs[i] = pairs[idx];
    pairs[idx] = t;
  }
  pairs.forEach(([from, to], i) => {
    engine.scheduleEvent(atTick, eventIdPrefix + ':flood:' + String(i) + ':' + String(atTick), () => {
      const node = engine.getNode(from);
      if (node && node.isAlive) node.sendMessage(to, params.payload, params.messageType, engine.runtime.clock.currentTick);
    });
  });
}
