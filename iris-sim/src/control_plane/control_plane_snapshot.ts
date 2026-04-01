/**
 * Microstep 16D — Build aggregated {@link ControlPlaneSnapshot} from registry + state.
 */

import type { ControlPlaneNodeInfo, ControlPlaneSnapshot, IrisNodeId } from './control_plane_types.js';
import type { ControlPlaneRegistry } from './control_plane_registry.js';
import type { ControlPlaneState } from './control_plane_state.js';

export function buildClusterSnapshot(
  registry: ControlPlaneRegistry,
  state: ControlPlaneState,
  now: number,
): ControlPlaneSnapshot {
  const nodes: ControlPlaneSnapshot['nodes'] = {};
  let maxTs = 0;
  let healthy = 0;
  let degraded = 0;

  const ids = new Set<IrisNodeId>([...registry.getAllNodeIds(), ...state.getAllSnapshots().keys()]);

  for (const nodeId of [...ids].sort((a, b) => a.localeCompare(b))) {
    const snap = state.getNodeSnapshot(nodeId);
    if (!snap) continue;

    const infoRaw = registry.getNode(nodeId, now);
    const info: ControlPlaneNodeInfo =
      infoRaw ??
      ({
        nodeId,
        lastSeen: snap.node.timestamp,
        status: 'offline',
        trustState: 'REVOKED',
        activeSecret: '',
        createdAt: snap.node.timestamp,
      } as ControlPlaneNodeInfo);

    nodes[nodeId] = { info, observability: snap };

    if (snap.node.timestamp > maxTs) maxTs = snap.node.timestamp;

    if (info.status === 'online') healthy++;
    else if (info.status === 'stale') degraded++;
  }

  const nodeCount = Object.keys(nodes).length;

  return {
    cluster: {
      nodeCount,
      healthyNodes: healthy,
      degradedNodes: degraded,
      timestamp: maxTs > 0 ? maxTs : now,
    },
    nodes,
  };
}
