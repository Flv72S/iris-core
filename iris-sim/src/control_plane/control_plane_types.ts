/**
 * Microstep 16D — IRIS Control Plane domain types (node-agnostic).
 */

import type { IrisObservabilitySnapshot } from '../observability/observability_contract.js';
import type { TrustState } from './trust_types.js';

export type IrisNodeId = string;

export type ControlPlaneNodeInfo = {
  nodeId: IrisNodeId;
  lastSeen: number;
  status: 'online' | 'stale' | 'offline';
  trustState: TrustState;
  activeSecret: string;
  nextSecret?: string;
  rotationSecretDelivered?: boolean;
  rotationExpiresAt?: number;
  createdAt: number;
  rotatedAt?: number;
  revokedAt?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Aggregated cluster view: one observability snapshot per known node.
 */
export type ControlPlaneSnapshot = {
  cluster: {
    nodeCount: number;
    healthyNodes: number;
    degradedNodes: number;
    timestamp: number;
  };

  nodes: Record<
    IrisNodeId,
    {
      info: ControlPlaneNodeInfo;
      observability: IrisObservabilitySnapshot;
    }
  >;
};

export const CP_ONLINE_MAX_MS = 10_000;
export const CP_STALE_MAX_MS = 60_000;
