import { readFile } from 'node:fs/promises';

import type { ComplianceDecision } from '../../../distributed/cluster_compliance_engine';
import { parseArgs } from './cli_parser';

export interface SendDecisionCommand {
  readonly port: number;
  readonly decision: ComplianceDecision;
}

export async function buildSendDecisionCommand(argv: readonly string[]): Promise<SendDecisionCommand> {
  const args = parseArgs(argv);
  const port = Number(args.port ?? '3001');
  const file = args.file;
  if (file === undefined) throw new Error('--file is required');
  const decision = JSON.parse(await readFile(file, 'utf8')) as ComplianceDecision;
  return Object.freeze({ port, decision });
}
