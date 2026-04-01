import type { CliCommandResult } from '../cli_types.js';

function baseUrlFromArgv(argv: string[]): string {
  const idx = argv.findIndex((a) => a === '--url');
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1]!.startsWith('-')) {
    return argv[idx + 1]!;
  }
  return process.env.IRIS_CONTROL_PLANE_URL ?? 'http://127.0.0.1:9470';
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<unknown>;
}

function positionalArgs(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--url' && argv[i + 1]) {
      i++;
      continue;
    }
    if (a.startsWith('-')) continue;
    out.push(a);
  }
  return out;
}

export async function runCluster(cwd: string, argv: string[]): Promise<CliCommandResult> {
  void cwd;
  const jsonMode = argv.includes('--json');
  const base = baseUrlFromArgv(argv).replace(/\/+$/, '');
  const positional = positionalArgs(argv);
  const sub = positional[0];
  const nodeIdArg = positional[1];

  try {
    if (sub === undefined) {
      const url = `${base}/cluster`;
      const data = await fetchJson(url);
      if (jsonMode) {
        console.log(JSON.stringify(data));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
      return { exitCode: 0 };
    }

    if (sub === 'nodes') {
      const url = `${base}/nodes`;
      const data = await fetchJson(url);
      if (jsonMode) {
        console.log(JSON.stringify(data));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
      return { exitCode: 0 };
    }

    if (sub === 'node') {
      if (!nodeIdArg) {
        console.error('Usage: iris cluster node <nodeId> [--url <base>] [--json]');
        return { exitCode: 1 };
      }
      const url = `${base}/nodes/${encodeURIComponent(nodeIdArg)}`;
      const data = await fetchJson(url);
      if (jsonMode) {
        console.log(JSON.stringify(data));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
      return { exitCode: 0 };
    }

    console.error('Usage: iris cluster [--url <base>] [--json]');
    console.error('       iris cluster nodes [--url <base>] [--json]');
    console.error('       iris cluster node <nodeId> [--url <base>] [--json]');
    return { exitCode: 1 };
  } catch (e) {
    console.error((e as Error).message);
    return { exitCode: 1 };
  }
}
