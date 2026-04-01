import type { CRDTOperation } from './crdt_types.js';

export interface CRDT<TState> {
  apply(op: CRDTOperation<any>): void;
  merge(state: TState): void;
  getState(): TState;
}

