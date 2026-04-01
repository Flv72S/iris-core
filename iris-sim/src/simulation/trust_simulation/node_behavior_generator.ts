/**
 * Trust Simulation Test Framework. Synthetic NodeBehaviorProfile generation.
 * Deterministic when seed is fixed.
 */

import type { NodeBehaviorProfile } from '../../network/behavior_monitoring/index.js';
import { SimulatedNodeType, type SimulatedNode } from './simulation_types.js';

/** Deterministic value in [0, 1) from seed + inputs. */
function seededUnit(seed: number, node_id: string, timestamp: number, index: number): number {
  let h = (seed * 31 + timestamp) | 0;
  for (let i = 0; i < node_id.length; i++) {
    h = ((h << 5) - h + node_id.charCodeAt(i)) | 0;
  }
  h = (h + index) * 1103515245 + 12345;
  h = (h >>> 0) % 0x7fffffff;
  return h / 0x7fffffff;
}

/** Pick value in [low, high] (inclusive) deterministically. */
function inRange(seed: number, node_id: string, ts: number, index: number, low: number, high: number): number {
  const u = seededUnit(seed, node_id, ts, index);
  const range = high - low + 1;
  return low + Math.floor(u * range);
}

function profile(
  node_id: string,
  total_events: number,
  action_count: number,
  consensus_votes: number,
  validations_performed: number,
  governance_actions: number,
  last_activity_timestamp: number
): NodeBehaviorProfile {
  return Object.freeze({
    node_id,
    total_events,
    action_count,
    consensus_votes,
    validations_performed,
    governance_actions,
    last_activity_timestamp,
  });
}

/**
 * Generate a behavior profile for a simulated node. Deterministic for fixed seed.
 */
export function generateBehaviorProfile(
  node: SimulatedNode,
  timestamp: number,
  seed: number = 0
): NodeBehaviorProfile {
  const { node_id, node_type } = node;
  const s = (i: number, lo: number, hi: number) => inRange(seed, node_id, timestamp, i, lo, hi);

  switch (node_type) {
    case SimulatedNodeType.HONEST_NODE:
      return profile(
        node_id,
        s(0, 40, 60),
        s(1, 10, 25),
        s(2, 20, 30),
        s(3, 10, 20),
        s(4, 1, 5),
        timestamp
      );
    case SimulatedNodeType.PASSIVE_NODE:
      return profile(
        node_id,
        s(0, 2, 10),
        s(1, 0, 3),
        s(2, 0, 5),
        s(3, 0, 3),
        0,
        timestamp
      );
    case SimulatedNodeType.VALIDATOR_NODE:
      return profile(
        node_id,
        s(0, 50, 80),
        s(1, 5, 15),
        s(2, 20, 30),
        s(3, 30, 60),
        s(4, 0, 5),
        timestamp
      );
    case SimulatedNodeType.HIGH_ACTIVITY_NODE:
      return profile(
        node_id,
        s(0, 120, 200),
        s(1, 30, 60),
        s(2, 40, 80),
        s(3, 20, 50),
        s(4, 5, 15),
        timestamp
      );
    case SimulatedNodeType.ANOMALOUS_NODE:
      return profile(node_id, 200, 200, 0, 0, 0, timestamp);
    default:
      return profile(node_id, s(0, 40, 60), s(1, 10, 20), s(2, 10, 20), s(3, 5, 15), 0, timestamp);
  }
}
