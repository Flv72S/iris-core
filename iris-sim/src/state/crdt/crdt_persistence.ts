import fs from 'node:fs';
import path from 'node:path';
import type { CRDTOperation } from './crdt_types.js';

export class CRDTPersistence {
  private readonly statePath: string;
  private readonly opsPath: string;
  constructor(cwd: string) {
    const dir = path.join(cwd, '.iris');
    this.statePath = path.join(dir, 'crdt_state.json');
    this.opsPath = path.join(dir, 'crdt_ops.log');
    fs.mkdirSync(dir, { recursive: true });
  }

  appendOperation(op: CRDTOperation<any>): void {
    fs.appendFileSync(this.opsPath, `${JSON.stringify(op)}\n`, 'utf8');
  }

  saveSnapshot(state: Record<string, unknown>): void {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  loadSnapshot(): Record<string, unknown> | null {
    try {
      if (!fs.existsSync(this.statePath)) return null;
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  loadOperations(): CRDTOperation<any>[] {
    try {
      if (!fs.existsSync(this.opsPath)) return [];
      const lines = fs.readFileSync(this.opsPath, 'utf8').split(/\r?\n/).filter(Boolean);
      return lines.map((l) => JSON.parse(l) as CRDTOperation<any>);
    } catch {
      return [];
    }
  }
}

