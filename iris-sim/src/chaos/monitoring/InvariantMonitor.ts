/**
 * S-2 Refinement — Invariant monitor. Hard (safety) vs Soft (operational).
 * Strict mode: throw only when hard violation is recorded.
 */

import type { SimulatedMessage } from '../../simulation/node/NodeTypes.js';
import type { SimulatedNode } from '../../simulation/node/SimulatedNode.js';
import { HardInvariantType, SoftInvariantType } from './InvariantTypes.js';

export type GetNodeFn = (nodeId: string) => SimulatedNode | undefined;

export class InvariantViolation extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvariantViolation';
    Object.setPrototypeOf(this, InvariantViolation.prototype);
  }
}

export interface InvariantMonitorSerialized {
  readonly deliveredMessageIds: readonly string[];
  readonly lastTick: string;
  readonly hardViolations: Readonly<Record<string, number>>;
  readonly softEvents: Readonly<Record<string, number>>;
}

export class InvariantMonitor {
  private readonly _strictMode: boolean;
  private readonly _deliveredMessageIds: Set<string> = new Set();
  private _lastTick = -1n;
  private readonly _hardViolations: Map<HardInvariantType, number> = new Map();
  private readonly _softEvents: Map<SoftInvariantType, number> = new Map();

  constructor(strictMode: boolean) {
    this._strictMode = strictMode;
  }

  recordHardViolation(type: HardInvariantType): void {
    const n = this._hardViolations.get(type) ?? 0;
    this._hardViolations.set(type, n + 1);
    if (this._strictMode) {
      throw new InvariantViolation(type, 'Hard invariant violated: ' + type);
    }
  }

  recordSoftEvent(type: SoftInvariantType): void {
    const n = this._softEvents.get(type) ?? 0;
    this._softEvents.set(type, n + 1);
  }

  get hardViolationCount(): number {
    let sum = 0;
    for (const v of this._hardViolations.values()) sum += v;
    return sum;
  }

  get softEventCount(): number {
    let sum = 0;
    for (const v of this._softEvents.values()) sum += v;
    return sum;
  }

  getHardBreakdown(): Readonly<Record<HardInvariantType, number>> {
    const out: Record<string, number> = {};
    for (const k of Object.values(HardInvariantType)) {
      out[k] = this._hardViolations.get(k) ?? 0;
    }
    return out as Record<HardInvariantType, number>;
  }

  getSoftBreakdown(): Readonly<Record<SoftInvariantType, number>> {
    const out: Record<string, number> = {};
    for (const k of Object.values(SoftInvariantType)) {
      out[k] = this._softEvents.get(k) ?? 0;
    }
    return out as Record<SoftInvariantType, number>;
  }

  checkDelivery(nodeId: string, message: SimulatedMessage, getNode: GetNodeFn): boolean {
    const node = getNode(nodeId);
    if (node && !node.isAlive) {
      this.recordSoftEvent(SoftInvariantType.DELIVERY_TO_DEAD_NODE);
      return false;
    }
    if (this._deliveredMessageIds.has(message.messageId)) {
      this.recordHardViolation(HardInvariantType.DOUBLE_DELIVERY);
      return false;
    }
    this._deliveredMessageIds.add(message.messageId);
    return true;
  }

  checkTick(tick: bigint): void {
    if (tick < this._lastTick) {
      this.recordHardViolation(HardInvariantType.NEGATIVE_TICK);
    }
    this._lastTick = tick;
  }

  get deliveredCount(): number {
    return this._deliveredMessageIds.size;
  }

  serialize(): InvariantMonitorSerialized {
    const hard: Record<string, number> = {};
    for (const [k, v] of this._hardViolations) hard[k] = v;
    const soft: Record<string, number> = {};
    for (const [k, v] of this._softEvents) soft[k] = v;
    return Object.freeze({
      deliveredMessageIds: [...this._deliveredMessageIds],
      lastTick: String(this._lastTick),
      hardViolations: Object.freeze(hard),
      softEvents: Object.freeze(soft),
    });
  }

  deserialize(data: InvariantMonitorSerialized): void {
    this._deliveredMessageIds.clear();
    for (const id of data.deliveredMessageIds) this._deliveredMessageIds.add(id);
    this._lastTick = BigInt(data.lastTick);
    this._hardViolations.clear();
    for (const [k, v] of Object.entries(data.hardViolations)) {
      if (v > 0) this._hardViolations.set(k as HardInvariantType, v);
    }
    this._softEvents.clear();
    for (const [k, v] of Object.entries(data.softEvents)) {
      if (v > 0) this._softEvents.set(k as SoftInvariantType, v);
    }
  }

  reset(): void {
    this._deliveredMessageIds.clear();
    this._lastTick = -1n;
    this._hardViolations.clear();
    this._softEvents.clear();
  }
}
