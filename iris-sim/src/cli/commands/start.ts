import fs from 'node:fs';
import { IrisNode } from '../../sdk/index.js';
import { cliLogger } from '../utils/cli_logger.js';
import { startSpinner } from '../utils/cli_spinner.js';
import type { CliCommandResult } from '../cli_types.js';
import { isPidAlive, logPath, readPid, readState, removePid, writePid, writeState } from './state_store.js';
import { resolveConfig } from './config.js';
import { setActiveNode } from './node_runtime.js';
import { spawnDaemonStart } from '../daemon_manager.js';

export async function runStart(cwd: string, opts?: { daemon?: boolean; internal?: boolean }): Promise<CliCommandResult> {
  const pid = readPid(cwd);
  if (pid != null) {
    if (isPidAlive(pid) && !(opts?.internal && pid === process.pid)) {
      console.log('⚠️ IRIS already running');
      console.log(`\nPID: ${pid}`);
      console.log('Use:\n  iris status\n  iris stop');
      return { exitCode: 0 };
    }
    if (!isPidAlive(pid)) removePid(cwd);
  }
  const st = readState(cwd);
  if (st && st.status === 'running' && isPidAlive(st.pid)) {
    cliLogger.warning(`Node already running (PID ${st.pid})`);
    return { exitCode: 0 };
  }
  if (opts?.daemon && !opts.internal) {
    const daemonPid = spawnDaemonStart(cwd);
    console.log('🚀 IRIS Node started in background');
    console.log(`\nPID: ${daemonPid}`);
    console.log(`ID: ${st?.node_id ?? 'auto-generated'}`);
    console.log('\nUse:\n  iris status\n  iris stop');
    return { exitCode: 0 };
  }

  const cfg = resolveConfig(cwd);
  const stopSpin = startSpinner('Starting IRIS node...');
  const loggerFile = logPath(cwd);
  const appendLog = (line: string) => fs.appendFileSync(loggerFile, `${line}\n`, 'utf8');

  const tryPorts = [cfg.transport.options.port, cfg.transport.options.port + 1];
  let portUsed = tryPorts[0];
  let lastErr: unknown = null;

  for (const port of tryPorts) {
    const node = new IrisNode({
      ...(cfg.node_id ? { node_id: cfg.node_id } : {}),
      transport: { type: 'ws', options: { host: cfg.transport.options.host, port } },
      features: cfg.features,
      dev_mode: cfg.dev_mode,
      observability: {
        ...(cfg.observability ?? {}),
        cwd,
        pretty: true,
      },
    });

    node.on('node:ready', () => appendLog('[event] node:ready'));
    node.on('message', (m: any) => appendLog(`[event] message ${JSON.stringify(m)}`));
    node.on('error', (e: any) => appendLog(`[event] error ${JSON.stringify(e)}`));

    try {
      await node.start();
      portUsed = port;
      stopSpin();
      const status = node.getStatus();
      console.log('🚀 IRIS Node is running');
      console.log(`\nID: ${status.node_id}`);
      console.log(`Transport: ws://localhost:${portUsed}`);
      console.log(`Mode: ${cfg.dev_mode ? 'DEVELOPMENT' : 'PRODUCTION'}`);
      console.log('\n✔ Ready to receive messages');
      writeState(cwd, {
        pid: process.pid,
        node_id: status.node_id,
        started_at: Date.now(),
        status: 'running',
        port: portUsed,
        log_file: loggerFile,
      });
      writePid(cwd, process.pid);
      setActiveNode(node);
      return { exitCode: 0 };
    } catch (e) {
      lastErr = e;
      if (port !== tryPorts[tryPorts.length - 1]) {
        cliLogger.warning(`Port ${port} already in use -> trying ${port + 1}...`);
        continue;
      }
    }
  }

  stopSpin();
  console.error('❌ IRIS Error\n');
  cliLogger.error((lastErr as Error)?.message ?? 'Failed to start node');
  return { exitCode: 1 };
}

