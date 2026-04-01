import type { CRDT } from './crdt_base.js';
import type { CRDTOperation } from './crdt_types.js';

export type CRDTMapState = Record<string, unknown>;

export class CRDTMap implements CRDT<CRDTMapState> {
  private readonly map = new Map<string, unknown>();

  apply(op: CRDTOperation<any>): void {
    if (op.type === 'MAP_SET') {
      const p = op.payload as { key: string; value: unknown };
      this.map.set(p.key, p.value);
      return;
    }
    if (op.type === 'MAP_DELETE') {
      const p = op.payload as { key: string };
      this.map.delete(p.key);
    }
  }

  merge(state: CRDTMapState): void {
    for (const [k, v] of Object.entries(state)) this.map.set(k, v);
  }

  getState(): CRDTMapState {
    return Object.fromEntries(this.map.entries());
  }
}

