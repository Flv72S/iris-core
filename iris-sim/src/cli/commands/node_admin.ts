import type { CliCommandResult } from '../cli_types.js';

function baseUrlFromArgv(argv: string[]): string {
  const idx = argv.findIndex((a) => a === '--url');
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1]!.startsWith('-')) {
    return argv[idx + 1]!;
  }
  return process.env.IRIS_CONTROL_PLANE_URL ?? 'http://127.0.0.1:9470';
}

async function postJson(url: string): Promise<unknown> {
  const res = await fetch(url, { method: 'POST' });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);
  try {
    return JSON.parse(txt) as unknown;
  } catch {
    return { ok: true };
  }
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

export async function runNodeAdmin(cwd: string, argv: string[]): Promise<CliCommandResult> {
  void cwd;
  const jsonMode = argv.includes('--json');
  const base = baseUrlFromArgv(argv).replace(/\/+$/, '');
  const pos = positionalArgs(argv);
  const action = pos[0];
  const nodeId = pos[1];
  if (!action || !nodeId) {
    console.error(
      'Usage: iris node <activate|revoke|rotate|rotation-complete> <nodeId> [--url <base>] [--json] [--confirm] [--dry-run]',
    );
    return { exitCode: 1 };
  }

  if (action === 'revoke' && !argv.includes('--confirm')) {
    console.error('ERROR: destructive operation requires --confirm');
    return { exitCode: 1 };
  }
  if (action === 'revoke' && argv.includes('--dry-run')) {
    console.log(`[DRY RUN] revoke node: ${nodeId}`);
    return { exitCode: 0 };
  }

  let path = '';
  if (action === 'activate') path = `/nodes/${encodeURIComponent(nodeId)}/activate`;
  else if (action === 'revoke') path = `/nodes/${encodeURIComponent(nodeId)}/revoke`;
  else if (action === 'rotate') path = `/nodes/${encodeURIComponent(nodeId)}/rotate`;
  else if (action === 'rotation-complete') path = `/nodes/${encodeURIComponent(nodeId)}/rotation/complete`;
  else {
    console.error(
      'Usage: iris node <activate|revoke|rotate|rotation-complete> <nodeId> [--url <base>] [--json] [--confirm] [--dry-run]',
    );
    return { exitCode: 1 };
  }

  try {
    const out = await postJson(`${base}${path}`);
    if (jsonMode) console.log(JSON.stringify(out));
    else console.log(JSON.stringify(out, null, 2));
    return { exitCode: 0 };
  } catch (e) {
    console.error((e as Error).message);
    return { exitCode: 1 };
  }
}

