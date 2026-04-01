import { createHash } from 'node:crypto';
import { stableStringify } from '../../security/stable_json.js';

export type LogicalTimestamp = {
  counter: number;
  nodeId: string;
};

export type CRDTOperation<T = unknown> = {
  opId: string;
  crdtId: string;
  type: string;
  payload: T;
  timestamp: LogicalTimestamp;
  nodeId: string;
  signature?: string;
};

export function canonicalizeCRDTOperation(op: Omit<CRDTOperation<any>, 'signature'>): string {
  return stableStringify({
    opId: op.opId,
    crdtId: op.crdtId,
    type: op.type,
    payload: op.payload,
    timestamp: op.timestamp,
    nodeId: op.nodeId,
  });
}

export function computeDeterministicOpId(input: {
  crdtId: string;
  type: string;
  payload: unknown;
  timestamp: LogicalTimestamp;
  nodeId: string;
}): string {
  return createHash('sha256')
    .update(
      stableStringify({
        crdtId: input.crdtId,
        type: input.type,
        payload: input.payload,
        timestamp: input.timestamp,
        nodeId: input.nodeId,
      }),
      'utf8',
    )
    .digest('hex');
}

