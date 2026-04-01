import fs from 'node:fs';

import { readObservabilitySnapshot, sanitizeSnapshotForJson } from '../../observability/observability_persist.js';
import type { CliCommandResult } from '../cli_types.js';
import { observabilitySnapshotPath } from './state_store.js';

export async function runObservability(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const p = observabilitySnapshotPath(cwd);
  if (!fs.existsSync(p)) {
    const empty = { node: { id: 'unknown', timestamp: Date.now(), uptime_seconds: 0 }, metrics: { metrics: {}, timestamp: '', nodeId: 'unknown' } };
    if (jsonMode) {
      console.log(JSON.stringify(empty));
    } else {
      console.log('⚠️ No observability snapshot yet (start a node to populate `.iris/observability.snapshot.json`).');
    }
    return { exitCode: 0 };
  }
  try {
    const snap = readObservabilitySnapshot(cwd);
    if (!snap) {
      console.error('Invalid or unreadable observability snapshot');
      return { exitCode: 1 };
    }
    const payload = sanitizeSnapshotForJson(snap);
    if (jsonMode) {
      console.log(JSON.stringify(payload));
    } else {
      console.log(JSON.stringify(payload, null, 2));
    }
    return { exitCode: 0 };
  } catch (e) {
    console.error('Failed to read observability snapshot:', (e as Error).message);
    return { exitCode: 1 };
  }
}
