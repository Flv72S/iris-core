import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { IrisNode } from '../../../sdk/index.js';

let nextPort = 45100;
function allocatePort(): number {
  nextPort += 1;
  const pidBucket = process.pid % 1000;
  return 45000 + pidBucket * 10 + (nextPort % 10);
}

export type RuntimeNodeFactoryOptions = {
  nodeId?: string;
  cwd?: string;
  runtime?: {
    allowLegacy?: boolean;
    transport?: { secure?: boolean };
    gossip?: { enabled?: boolean };
    crdt?: { enabled?: boolean };
    federation?: { enabled?: boolean };
  };
  transportType?: string;
};

export function createRuntimeNode(options: RuntimeNodeFactoryOptions = {}): {
  node: IrisNode;
  cwd: string;
} {
  const cwd = options.cwd ?? fs.mkdtempSync(path.join(os.tmpdir(), 'iris-adr003a-'));
  const port = allocatePort();
  const node = new IrisNode({
    node_id: options.nodeId ?? 'adr003-node',
    observability: { cwd },
    transport: {
      type: (options.transportType ?? 'ws') as any,
      options: { port, host: '127.0.0.1' },
    },
    runtime: {
      allowLegacy: options.runtime?.allowLegacy ?? false,
      transport: { secure: options.runtime?.transport?.secure ?? true },
      gossip: { enabled: options.runtime?.gossip?.enabled ?? true },
      crdt: { enabled: options.runtime?.crdt?.enabled ?? true },
      federation: { enabled: options.runtime?.federation?.enabled ?? true },
    },
  });
  return { node, cwd };
}

export function createTransportFailureNode(): { node: IrisNode; cwd: string } {
  // Invalid transport type forces failure during runInitPhase("transport").
  return createRuntimeNode({ transportType: 'invalid-transport-type' });
}

export async function startNode(node: IrisNode): Promise<void> {
  await node.start();
}

export async function stopNode(node: IrisNode): Promise<void> {
  await node.stop();
}

export function injectPhaseFailure(node: IrisNode, phase: 'identity' | 'transport' | 'observability'): void {
  const target = node as any;
  if (phase === 'identity') {
    target.initIdentity = () => {
      throw new Error('Injected identity phase failure');
    };
    return;
  }
  if (phase === 'transport') {
    target.initTransport = async () => {
      throw new Error('Injected transport phase failure');
    };
    return;
  }
  target.initObservability = () => {
    throw new Error('Injected observability phase failure');
  };
}

