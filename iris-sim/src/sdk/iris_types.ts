/**
 * Microstep 16A — IRIS SDK types.
 */

import type { TraceContext } from '../observability/tracing/trace_context.js';

export enum NodeState {
  INIT = 'INIT',
  STARTING = 'STARTING',
  READY = 'READY',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

export type NodeStatus = {
  started: boolean;
  node_id: string;
  active_sessions: number;
};

export type NodeStateSnapshot = {
  node_id: string;
  state: NodeState;
  started: boolean;
  last_sent_is_encrypted?: boolean;
};

export type IrisMessage = {
  type: string;
  payload: unknown;
  metadata?: Record<string, any>;
  /** Non-breaking: distributed trace propagation (Phase 16E.X3). */
  meta?: {
    trace?: TraceContext;
  };
};

export type NodeStatusWithState = NodeStatus & NodeStateSnapshot;

