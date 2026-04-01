import type { CRDT } from './crdt_base.js';
import type { CRDTOperation } from './crdt_types.js';

type AddPayload<T> = { value: T; tag: string };
type RemovePayload = { tags: string[] };

export type ORSetState<T> = {
  adds: Array<{ value: T; tag: string }>;
  removes: string[];
};

export class ORSetCRDT<T> implements CRDT<ORSetState<T>> {
  private readonly adds = new Map<string, T>(); // tag -> value
  private readonly removes = new Set<string>();

  apply(op: CRDTOperation<any>): void {
    if (op.type === 'ORSET_ADD') {
      const p = op.payload as AddPayload<T>;
      this.adds.set(p.tag, p.value);
      return;
    }
    if (op.type === 'ORSET_REMOVE') {
      const p = op.payload as RemovePayload;
      for (const tag of p.tags) this.removes.add(tag);
    }
  }

  merge(state: ORSetState<T>): void {
    for (const a of state.adds) this.adds.set(a.tag, a.value);
    for (const r of state.removes) this.removes.add(r);
  }

  getState(): ORSetState<T> {
    return {
      adds: [...this.adds.entries()].map(([tag, value]) => ({ tag, value })),
      removes: [...this.removes.values()],
    };
  }

  values(): T[] {
    const out: T[] = [];
    for (const [tag, v] of this.adds.entries()) {
      if (!this.removes.has(tag)) out.push(v);
    }
    return out;
  }
}

