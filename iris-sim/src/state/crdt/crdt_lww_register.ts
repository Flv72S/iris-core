import type { CRDT } from './crdt_base.js';
import { compareLogicalTimestamp } from './crdt_clock.js';
import type { CRDTOperation, LogicalTimestamp } from './crdt_types.js';

export type LWWState<T> = { value: T | null; timestamp: LogicalTimestamp | null };

export class LWWRegisterCRDT<T> implements CRDT<LWWState<T>> {
  private state: LWWState<T> = { value: null, timestamp: null };

  apply(op: CRDTOperation<T>): void {
    const ts = op.timestamp;
    if (!this.state.timestamp || compareLogicalTimestamp(ts, this.state.timestamp) >= 0) {
      this.state = { value: op.payload, timestamp: ts };
    }
  }

  merge(state: LWWState<T>): void {
    if (!state.timestamp) return;
    if (!this.state.timestamp || compareLogicalTimestamp(state.timestamp, this.state.timestamp) >= 0) {
      this.state = { ...state };
    }
  }

  getState(): LWWState<T> {
    return { ...this.state };
  }
}

