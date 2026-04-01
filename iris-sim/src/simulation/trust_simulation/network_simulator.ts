/**
 * Trust Simulation Test Framework. Network generation with type distribution.
 */

import { SimulatedNodeType, type SimulatedNode } from './simulation_types.js';

/**
 * Generate a network with deterministic type distribution:
 * 50% honest, 20% passive, 15% validator, 10% high activity, 5% anomalous.
 */
export function generateNetwork(node_count: number): SimulatedNode[] {
  const n = Math.max(0, node_count);
  const p50 = Math.floor(n * 0.5);
  const p20 = Math.floor(n * 0.2);
  const p15 = Math.floor(n * 0.15);
  const p10 = Math.floor(n * 0.1);
  const p5 = n - p50 - p20 - p15 - p10;

  const nodes: SimulatedNode[] = [];
  let idx = 0;
  for (let i = 0; i < p50; i++, idx++)
    nodes.push(Object.freeze({ node_id: `sim-node-${idx}`, node_type: SimulatedNodeType.HONEST_NODE }));
  for (let i = 0; i < p20; i++, idx++)
    nodes.push(Object.freeze({ node_id: `sim-node-${idx}`, node_type: SimulatedNodeType.PASSIVE_NODE }));
  for (let i = 0; i < p15; i++, idx++)
    nodes.push(Object.freeze({ node_id: `sim-node-${idx}`, node_type: SimulatedNodeType.VALIDATOR_NODE }));
  for (let i = 0; i < p10; i++, idx++)
    nodes.push(Object.freeze({ node_id: `sim-node-${idx}`, node_type: SimulatedNodeType.HIGH_ACTIVITY_NODE }));
  for (let i = 0; i < p5; i++, idx++)
    nodes.push(Object.freeze({ node_id: `sim-node-${idx}`, node_type: SimulatedNodeType.ANOMALOUS_NODE }));

  return nodes;
}
