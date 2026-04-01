import fs from 'node:fs';

import type { CliCommandResult } from '../cli_types.js';
import { getActiveNode } from './node_runtime.js';
import { logPath, metricsPath, readState } from './state_store.js';

export async function runInspect(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const lastIdx = argv.findIndex((a) => a === '--last');
  const lastN = lastIdx >= 0 ? Math.max(1, Number(argv[lastIdx + 1]) || 20) : 20;
  const jsonMode = argv.includes('--json');

  const st = readState(cwd);
  const local = getActiveNode();
  const mp = metricsPath(cwd);
  const lp = logPath(cwd);

  if (jsonMode) {
    const logs = fs.existsSync(lp) ? fs.readFileSync(lp, 'utf8').split(/\r?\n/).filter(Boolean).slice(-lastN) : [];
    const metrics = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, 'utf8')) : null;
    const payload = local
      ? {
          state: local.getStatus().state,
          node_id: local.getStatus().node_id,
          active_sessions: local.getStatus().active_sessions,
          metrics,
          logs,
        }
      : {
          state: st?.status ?? 'unknown',
          node_id: st?.node_id ?? 'unknown',
          pid: st?.pid,
          port: st?.port,
          metrics,
          logs,
        };
    console.log(JSON.stringify(payload));
    return { exitCode: 0 };
  }

  console.log('🔎 IRIS Inspect\n');
  if (local) {
    const s = local.getStatus();
    console.log('State (in-process):', s.state);
    console.log('Node ID:', s.node_id);
    console.log('Active sessions:', s.active_sessions);
    const m = local.getMetricsSnapshot();
    if (m) {
      console.log('\nMetrics snapshot:');
      console.log(JSON.stringify(m, null, 2));
    }
  } else if (st) {
    console.log('State (file):', st.status);
    console.log('Node ID:', st.node_id);
    console.log('PID:', st.pid);
    console.log('Port:', st.port);
  } else {
    console.log('State: no iris.state.json');
  }

  if (fs.existsSync(mp)) {
    console.log('\n--- metrics.json ---');
    console.log(fs.readFileSync(mp, 'utf8'));
  } else {
    console.log('\n(metrics.json not found)');
  }

  if (fs.existsSync(lp)) {
    const lines = fs.readFileSync(lp, 'utf8').split(/\r?\n/).filter(Boolean);
    const tail = lines.slice(Math.max(0, lines.length - lastN));
    console.log(`\n--- last ${tail.length} log lines ---`);
    console.log(tail.join('\n'));
  } else {
    console.log('\n(iris.log not found)');
  }

  return { exitCode: 0 };
}
