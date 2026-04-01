/**
 * S-1 — Deterministic Byzantine behaviors. Based on nodeId, seed, tick only.
 */

import type { SimulatedMessage } from '../node/NodeTypes.js';
import type { ByzantineBehaviorType } from './ActorTypes.js';

export type ByzantineEvaluator = (
  nodeId: string,
  seed: string,
  tick: bigint,
  message: SimulatedMessage,
  rng: { nextInt: (n: number) => number }
) => ByzantineBehaviorType;

const BEHAVIORS: ByzantineBehaviorType[] = ['duplicate', 'delay', 'mutate', 'drop', 'silent_fail'];

export function deterministicByzantineChoice(
  nodeId: string,
  seed: string,
  tick: bigint,
  _rng: { nextInt: (n: number) => number }
): ByzantineBehaviorType {
  const h = nodeId + seed + String(tick);
  let n = 0;
  for (let i = 0; i < h.length; i++) n = (n * 31 + h.charCodeAt(i)) | 0;
  const idx = Math.abs(n) % BEHAVIORS.length;
  return BEHAVIORS[idx];
}

export function applyByzantineBehavior(
  nodeId: string,
  seed: string,
  tick: bigint,
  message: SimulatedMessage,
  rng: { nextInt: (n: number) => number }
): { type: ByzantineBehaviorType; messages: SimulatedMessage[] } {
  const type = deterministicByzantineChoice(nodeId, seed, tick, rng);
  switch (type) {
    case 'drop':
    case 'silent_fail':
      return { type, messages: [] };
    case 'duplicate':
      return { type, messages: [message, Object.freeze({ ...message })] };
    case 'mutate':
      return {
        type,
        messages: [
          Object.freeze({
            ...message,
            payload: '[MUTATED]',
          }),
        ],
      };
    case 'delay':
      return { type, messages: [message] };
    default:
      return { type: 'drop', messages: [] };
  }
}
