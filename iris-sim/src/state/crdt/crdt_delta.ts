import type { CRDTOperation } from './crdt_types.js';

export type CRDTDelta = {
  crdtId: string;
  ops: CRDTOperation<any>[];
};

export function computeMissingOps(allOps: CRDTOperation<any>[], knownOpIds: Set<string>): CRDTOperation<any>[] {
  return allOps.filter((op) => !knownOpIds.has(op.opId));
}

