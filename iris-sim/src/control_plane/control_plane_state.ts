/**
 * Microstep 16D — Latest validated observability snapshot per node (single source per nodeId).
 */

import type { IrisObservabilitySnapshot } from '../observability/observability_contract.js';
import type { IrisNodeId } from './control_plane_types.js';

export type NodeStateEntry = {
  snapshot: IrisObservabilitySnapshot;
};

export class ControlPlaneState {
  private readonly byNode = new Map<IrisNodeId, NodeStateEntry>();

  /**
   * Stores snapshot if it is newer or equal in wall-clock terms (node.timestamp monotonic per node).
   * Returns false if rejected (older snapshot).
   */
  setNodeSnapshot(nodeId: IrisNodeId, snapshot: IrisObservabilitySnapshot): boolean {
    const prev = this.byNode.get(nodeId);
    if (prev && snapshot.node.timestamp < prev.snapshot.node.timestamp) {
      return false;
    }
    this.byNode.set(nodeId, { snapshot });
    return true;
  }

  getNodeSnapshot(nodeId: IrisNodeId): IrisObservabilitySnapshot | undefined {
    return this.byNode.get(nodeId)?.snapshot;
  }

  getAllSnapshots(): Map<IrisNodeId, IrisObservabilitySnapshot> {
    const m = new Map<IrisNodeId, IrisObservabilitySnapshot>();
    for (const [id, e] of this.byNode) {
      m.set(id, e.snapshot);
    }
    return m;
  }

  getStoredTimestamp(nodeId: IrisNodeId): number | undefined {
    return this.byNode.get(nodeId)?.snapshot.node.timestamp;
  }
}
