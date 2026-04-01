import { createHash } from 'node:crypto';
import { stableStringify } from '../../security/stable_json.js';
import type { CRDT } from './crdt_base.js';
import { CRDTLogicalClock } from './crdt_clock.js';
import type { CRDTOperation } from './crdt_types.js';
import { computeDeterministicOpId } from './crdt_types.js';
import { incCRDTMetric, setCRDTMetric } from './crdt_metrics.js';

export class CRDTEngine {
  private readonly nodeId: string;
  private readonly registry = new Map<string, CRDT<any>>();
  private readonly clock: CRDTLogicalClock;
  private readonly appliedOpIds = new Set<string>();
  private readonly opLog: CRDTOperation<any>[] = [];

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.clock = new CRDTLogicalClock(nodeId);
  }

  registerCRDT(id: string, crdt: CRDT<any>): void {
    this.registry.set(id, crdt);
  }

  getCRDT<T = any>(id: string): CRDT<T> | undefined {
    return this.registry.get(id) as CRDT<T> | undefined;
  }

  createOperation<T>(args: { crdtId: string; type: string; payload: T }): Omit<CRDTOperation<T>, 'signature'> {
    const ts = this.clock.now();
    const opId = computeDeterministicOpId({
      crdtId: args.crdtId,
      type: args.type,
      payload: args.payload,
      timestamp: ts,
      nodeId: this.nodeId,
    });
    return {
      opId,
      crdtId: args.crdtId,
      type: args.type,
      payload: args.payload,
      timestamp: ts,
      nodeId: this.nodeId,
    };
  }

  applyOperation(op: CRDTOperation<any>): void {
    if (this.appliedOpIds.has(op.opId)) return;
    const crdt = this.registry.get(op.crdtId);
    if (!crdt) {
      incCRDTMetric('operationsRejected', 1);
      return;
    }
    this.clock.observe(op.timestamp);
    crdt.apply(op);
    this.appliedOpIds.add(op.opId);
    this.opLog.push(op);
    incCRDTMetric('operationsApplied', 1);
    setCRDTMetric('stateSize', JSON.stringify(this.getStateSnapshot()).length);
  }

  getStateSnapshot(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [id, crdt] of this.registry.entries()) out[id] = crdt.getState();
    return out;
  }

  getStateHash(): string {
    return createHash('sha256').update(stableStringify(this.getStateSnapshot()), 'utf8').digest('hex');
  }

  getOperationLog(): CRDTOperation<any>[] {
    return [...this.opLog];
  }

  getKnownOpIds(): Set<string> {
    return new Set(this.appliedOpIds);
  }
}

