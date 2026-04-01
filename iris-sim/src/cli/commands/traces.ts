import fs from 'node:fs';

import { readObservabilitySnapshot } from '../../observability/observability_persist.js';
import type { CliCommandResult } from '../cli_types.js';
import { tracesPath } from './state_store.js';

type TracesFile = {
  nodeId?: string;
  timestamp?: string;
  spans?: unknown[];
};

function loadTraces(cwd: string): TracesFile | null {
  const unified = readObservabilitySnapshot(cwd);
  if (unified?.traces) {
    return {
      nodeId: unified.node.id,
      timestamp: unified.metrics.timestamp,
      spans: unified.traces.spans,
    };
  }
  const p = tracesPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as TracesFile;
  } catch {
    return null;
  }
}

export async function runTraces(cwd: string, argv: string[]): Promise<CliCommandResult> {
  const jsonMode = argv.includes('--json');
  const data = loadTraces(cwd);
  if (!data) {
    if (jsonMode) {
      console.log(JSON.stringify({ nodeId: 'unknown', timestamp: new Date().toISOString(), spans: [] }));
    } else {
      console.log('⚠️ No traces snapshot yet (run a node with tracing enabled to populate `.iris/observability.snapshot.json`).');
    }
    return { exitCode: 0 };
  }
  try {
    const spans = Array.isArray(data.spans) ? data.spans : [];
    if (jsonMode) {
      console.log(JSON.stringify({ nodeId: data.nodeId ?? 'unknown', timestamp: data.timestamp ?? '', spans }));
    } else {
      console.log('🔭 IRIS traces (raw spans)\n');
      console.log(`nodeId: ${data.nodeId ?? 'unknown'}`);
      console.log(`timestamp: ${data.timestamp ?? ''}\n`);
      if (spans.length === 0) {
        console.log('(no spans)');
      } else {
        for (const s of spans) {
          console.log(JSON.stringify(s));
        }
      }
    }
    return { exitCode: 0 };
  } catch (e) {
    console.error('Failed to read traces:', (e as Error).message);
    return { exitCode: 1 };
  }
}
