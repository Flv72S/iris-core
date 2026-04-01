export type NodeConfig = {
  readonly nodeId: string;
  readonly port: number;
  readonly peers: readonly string[];
  readonly storagePath: string;
  readonly gossipIntervalMs: number;
  readonly retryIntervalMs: number;
  readonly maxRetryAttempts: number;
  readonly deterministicMode: boolean;
};

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePeers(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim().length === 0) return Object.freeze([]);
  const peers = value
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map((x) => (x.startsWith('http://') || x.startsWith('https://') ? x : `http://127.0.0.1:${x}`))
    .sort();
  return Object.freeze(peers);
}

export function parseNodeConfigFromArgv(argv: readonly string[]): NodeConfig {
  const args = new Map<string, string>();
  for (const item of argv) {
    if (!item.startsWith('--')) continue;
    const [k, v] = item.slice(2).split('=', 2);
    if (k.length > 0 && v !== undefined) args.set(k, v);
  }
  const port = toNumber(args.get('port'), 3001);
  return Object.freeze({
    nodeId: args.get('nodeId') ?? `node-${port}`,
    port,
    peers: parsePeers(args.get('peers')),
    storagePath: args.get('storagePath') ?? `.iris-node-${port}`,
    gossipIntervalMs: toNumber(args.get('gossipIntervalMs'), 500),
    retryIntervalMs: toNumber(args.get('retryIntervalMs'), 400),
    maxRetryAttempts: toNumber(args.get('maxRetryAttempts'), 6),
    deterministicMode: (args.get('deterministicMode') ?? 'true') !== 'false',
  });
}
