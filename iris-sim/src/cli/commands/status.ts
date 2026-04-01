import type { CliCommandResult } from '../cli_types.js';
import { isPidAlive, readPid, readState, removePid, writeState } from './state_store.js';
import { getActiveNode } from './node_runtime.js';

export async function runStatus(cwd: string): Promise<CliCommandResult> {
  const st = readState(cwd);
  if (!st) {
    console.log('📡 IRIS Node Status\n');
    console.log('State: STOPPED');
    return { exitCode: 0 };
  }
  const pid = readPid(cwd) ?? st.pid;
  const alive = pid === process.pid ? getActiveNode() != null : isPidAlive(pid);
  if (!alive) {
    removePid(cwd);
    writeState(cwd, { ...st, pid, status: 'stopped' });
  }
  const transport = `ws://localhost:${st.port}`;
  const active = pid === process.pid ? getActiveNode() : null;
  const sessions = alive ? ((active?.getStatus().active_sessions ?? 1) as number) : 0;
  const healthy = alive ? (active ? active.health().status === 'ok' : true) : false;
  console.log('📡 IRIS Node Status\n');
  console.log(`State: ${alive ? 'RUNNING' : 'STOPPED'}`);
  console.log(`ID: ${st.node_id}`);
  console.log(`PID: ${pid}`);
  console.log(`Transport: ${transport}`);
  console.log(healthy ? '\n✔ Healthy' : '\n✖ Unhealthy');
  console.log(`✔ Sessions active: ${sessions}`);
  return { exitCode: 0 };
}

