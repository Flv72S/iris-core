import fs from 'node:fs';
import path from 'node:path';

import { validateAuditSnapshot } from '../audit';

function usage(): void {
  console.error('Usage: iris-audit-validate <snapshotPath>');
}

function main(): void {
  const snapArg = process.argv[2];
  if (!snapArg || snapArg === '-h' || snapArg === '--help') {
    usage();
    process.exit(snapArg ? 0 : 1);
  }

  const snapshotPath = path.resolve(snapArg);
  if (!fs.existsSync(snapshotPath)) {
    console.error(`INVALID\n  - Snapshot file missing: ${snapshotPath}`);
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch (e) {
    console.error(`INVALID\n  - Cannot parse JSON: ${(e as Error).message}`);
    process.exit(1);
  }

  const result = validateAuditSnapshot(raw, true);
  for (const line of result.report) {
    console.log(line);
  }
  process.exit(result.valid ? 0 : 1);
}

main();
