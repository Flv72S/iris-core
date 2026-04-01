import fs from 'node:fs';
import path from 'node:path';

import type { TrustAuditRecord } from './audit_types.js';
import type { AuditMeta } from './audit_meta.js';

export const TRUST_AUDIT_LOG_FILENAME = 'trust_audit.log';
export const TRUST_AUDIT_META_FILENAME = 'trust_audit.meta.json';

function trustAuditLogPath(cwd: string): string {
  return path.join(cwd, '.iris', TRUST_AUDIT_LOG_FILENAME);
}

function trustAuditMetaPath(cwd: string): string {
  return path.join(cwd, '.iris', TRUST_AUDIT_META_FILENAME);
}

export function appendAuditRecord(cwd: string, record: TrustAuditRecord): void {
  const p = trustAuditLogPath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  fs.appendFileSync(p, line, { encoding: 'utf8', flag: 'a' });
}

/**
 * Load NDJSON audit log. Malformed lines are a hard error (no silent drop).
 */
export function loadAuditLog(cwd: string): TrustAuditRecord[] {
  const p = trustAuditLogPath(cwd);
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  const out: TrustAuditRecord[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      out.push(JSON.parse(lines[i]!) as TrustAuditRecord);
    } catch {
      throw new Error(`AUDIT_LOG_CORRUPT: invalid JSON at line ${i + 1}`);
    }
  }
  return out;
}

export function writeAuditMeta(cwd: string, meta: AuditMeta): void {
  const p = trustAuditMetaPath(cwd);
  const tmp = `${p}.tmp`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, `${JSON.stringify(meta)}\n`, 'utf8');
  fs.renameSync(tmp, p);
}

export function readAuditMeta(cwd: string): AuditMeta | null {
  const p = trustAuditMetaPath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as AuditMeta;
  } catch {
    throw new Error('AUDIT_META_CORRUPT: unreadable trust_audit.meta.json');
  }
}
