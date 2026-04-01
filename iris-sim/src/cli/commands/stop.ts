import { cliLogger } from '../utils/cli_logger.js';
import type { CliCommandResult } from '../cli_types.js';
import { readPid, readState, removePid, writeState } from './state_store.js';
import { getActiveNode, setActiveNode } from './node_runtime.js';

export async function runStop(cwd: string): Promise<CliCommandResult> {
  const st = readState(cwd);
  const pidFile = readPid(cwd);
  if (!st && !pidFile) {
    console.log('⚠️  Warning\n');
    cliLogger.warning('PID not found; no active IRIS daemon');
    return { exitCode: 0 };
  }
  const pid = pidFile ?? (st as { pid: number }).pid;
  if (pid === process.pid) {
    const node = getActiveNode();
    if (node) {
      await node.stop();
      setActiveNode(null);
      console.log('🛑 IRIS Node stopped');
      console.log(`\nPID: ${pid}`);
    } else {
      cliLogger.warning('No in-process node instance found; marking as stopped');
    }
  } else {
    try {
      process.kill(pid, 'SIGTERM');
      console.log('🛑 IRIS Node stopped');
      console.log(`\nPID: ${pid}`);
    } catch {
      cliLogger.warning(`PID ${pid} not running; marking as stopped`);
    }
  }
  removePid(cwd);
  if (st) writeState(cwd, { ...st, pid, status: 'stopped' });
  return { exitCode: 0 };
}

