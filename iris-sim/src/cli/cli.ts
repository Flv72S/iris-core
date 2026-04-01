#!/usr/bin/env node
import { runStart } from './commands/start.js';
import { runStop } from './commands/stop.js';
import { runStatus } from './commands/status.js';
import { runInit } from './commands/init.js';
import { runLogs } from './commands/logs.js';
import { runConfig } from './commands/config.js';
import { runMetrics } from './commands/metrics.js';
import { runInspect } from './commands/inspect.js';
import { runBenchmark } from './commands/benchmark.js';
import { runTraces } from './commands/traces.js';
import { runAlerts } from './commands/alerts.js';
import { runObservability } from './commands/observability.js';
import { runCluster } from './commands/cluster.js';
import { runNodeAdmin } from './commands/node_admin.js';
import { runAudit } from './commands/audit.js';
import { runSync } from './commands/sync.js';
import { runKeys } from './commands/keys.js';
import { runPeers } from './commands/peers.js';
import { runDomain } from './commands/domain.js';
import { runTrust } from './commands/trust.js';
import { runTransport } from './commands/transport.js';
import { cliLogger } from './utils/cli_logger.js';

function usage(): void {
  console.log(`IRIS CLI

Usage:
  iris start
  iris stop
  iris status
  iris init [hello-world|messaging-basic|secure-node] [--yes]
  iris logs
  iris metrics [--pretty|--json|--prometheus]
  iris traces [--json]
  iris observability [--json]
  iris cluster [--url <base>] [--json]
  iris cluster nodes [--url <base>] [--json]
  iris cluster node <id> [--url <base>] [--json]
  iris node <activate|revoke|rotate|rotation-complete> <id> [--url <base>] [--json] [--confirm] [--dry-run]
  iris audit log [--json]
  iris audit snapshot [--json]
  iris audit verify [--deep] [--json]
  iris audit proof <index> [--json]
  iris audit verify-proof --file <proof.json> [--json]
  iris audit node <id> [--json]
  iris audit evidence <id> [--json]
  iris sync announce | state | request-proof <nodeId> <index> [--json]
  iris keys generate | show [--json]
  iris peers add <publicKeyPem> | iris peers revoke <nodeId> | iris peers [list] [--json]
  iris domain create <domainId> | iris domain trust <domainId> | iris domain [list] [--json]
  iris domain certificate generate | iris domain revoke <domainId> | iris domain show
  iris trust export | import <file> | bootstrap | status | revoke <domainId> | sync <remoteSnapshotFile> [--json]
  iris alerts <list|add|active|remove>
  iris inspect [--last N|--json]
  iris benchmark [--json]
  iris transport debug [--json]
  iris config
`);
}

export async function runCli(argv: string[], cwd = process.cwd()): Promise<number> {
  const cmd = argv[2];
  const flags = new Set(argv.slice(3));
  const daemon = flags.has('--daemon');
  const internal = flags.has('--internal');
  const follow = flags.has('--follow');
  const lastIdx = argv.findIndex((a) => a === '--last');
  const last = lastIdx >= 0 ? Number(argv[lastIdx + 1]) : undefined;
  try {
    switch (cmd) {
      case 'start':
        return (await runStart(cwd, { daemon, internal })).exitCode;
      case 'stop':
        return (await runStop(cwd)).exitCode;
      case 'status':
        return (await runStatus(cwd)).exitCode;
      case 'init':
        return (await runInit(cwd, argv)).exitCode;
      case 'logs':
        {
          const logOpts: { follow?: boolean; last?: number } = { follow };
          if (Number.isFinite(last)) logOpts.last = last as number;
          return (await runLogs(cwd, logOpts)).exitCode;
        }
      case 'config':
        return (await runConfig(cwd)).exitCode;
      case 'metrics':
        return (await runMetrics(cwd, argv)).exitCode;
      case 'traces':
        return (await runTraces(cwd, argv)).exitCode;
      case 'observability':
        return (await runObservability(cwd, argv)).exitCode;
      case 'cluster':
        return (await runCluster(cwd, argv)).exitCode;
      case 'node':
        return (await runNodeAdmin(cwd, argv)).exitCode;
      case 'alerts':
        return (await runAlerts(cwd, argv)).exitCode;
      case 'audit':
        return (await runAudit(cwd, argv)).exitCode;
      case 'sync':
        return (await runSync(cwd, argv)).exitCode;
      case 'keys':
        return (await runKeys(cwd, argv)).exitCode;
      case 'peers':
        return (await runPeers(cwd, argv)).exitCode;
      case 'domain':
        return (await runDomain(cwd, argv)).exitCode;
      case 'trust':
        return (await runTrust(cwd, argv)).exitCode;
      case 'transport':
        return (await runTransport(cwd, argv)).exitCode;
      case 'inspect':
        return (await runInspect(cwd, argv)).exitCode;
      case 'benchmark':
        return (await runBenchmark(cwd, argv)).exitCode;
      case undefined:
      case '--help':
      case '-h':
        usage();
        return 0;
      default:
        cliLogger.error(`Unknown command: ${cmd}`);
        usage();
        return 1;
    }
  } catch (e) {
    cliLogger.error((e as Error).message);
    return 1;
  }
}

if (import.meta.url.endsWith('/cli.js') || import.meta.url.includes('/dist/cli/cli.js')) {
  runCli(process.argv).then((code) => {
    const internal = process.argv.includes('--internal');
    const isStart = process.argv[2] === 'start';
    if (internal && isStart && code === 0) {
      // Keep daemon process alive while IrisNode runs in-process.
      return;
    }
    process.exit(code);
  });
}

