import { appendAuditRecord, loadAuditLog, writeAuditMeta, readAuditMeta } from './audit_persist.js';
import { chainAuditRecord, computeAuditRecordHash } from './audit_hash.js';
import type { TrustAuditRecord } from './audit_types.js';
import { signAuditRecord, signAuditRecordWithProviderSync, verifyAuditRecordSignature } from './audit_sign.js';
import type { KeyProvider } from './keys/key_types.js';
import { assertAuditMetaConsistent } from './audit_meta.js';
import { securityLog } from '../security/security_logger.js';
import { verifyTrustEvent } from '../security/trust_event_crypto.js';
import { verifySignature } from '../security/hmac.js';
import { stableStringify } from '../security/stable_json.js';
import type { TrustEvent } from './trust_events.js';
import { buildMerkleTree, getMerkleRoot as rootFromTree } from './merkle_tree.js';
import { generateMerkleProof } from './merkle_proof.js';
import { emptyMerkleLeafHash } from './merkle_hash.js';
import type { MerkleNode, MerkleProof } from './merkle_types.js';

export type AuditLogOptions = {
  cwd?: string;
  signingSecret?: string;
  signerNodeId?: string;
  /** When set and `signSync` is implemented, audit signatures use this provider (isolated from protocol keys). */
  auditKeyProvider?: KeyProvider;
};

export type AuditVerifyOptions = {
  deep?: boolean;
  resolveIssuerSecret?: (issuerNodeId: string) => string | undefined;
  resolveSignerSecret?: (signerNodeId: string) => string | undefined;
  resolveEndorserSecret?: (nodeId: string) => string | undefined;
};

function toTrustEvent(record: TrustAuditRecord): TrustEvent {
  return {
    eventId: record.eventId,
    issuerNodeId: record.issuer,
    nodeId: record.nodeId,
    timestamp: record.timestamp,
    type: record.eventType,
    payload: record.eventPayload ?? {},
    endorsements: record.endorsements ?? [],
    signature: record.eventSignature ?? '',
  };
}

function endorsementPayload(record: TrustAuditRecord): string {
  return stableStringify({
    eventId: record.eventId,
    issuerNodeId: record.issuer,
    nodeId: record.nodeId,
    timestamp: record.timestamp,
    type: record.eventType,
  });
}

export class AuditLog {
  private readonly records: TrustAuditRecord[] = [];
  private readonly cwd: string | undefined;
  private readonly signingSecret: string | undefined;
  private readonly signerNodeId: string | undefined;
  private readonly auditKeyProvider: KeyProvider | undefined;

  constructor(opts?: AuditLogOptions) {
    this.cwd = opts?.cwd;
    this.signingSecret = opts?.signingSecret;
    this.signerNodeId = opts?.signerNodeId;
    this.auditKeyProvider = opts?.auditKeyProvider;
    if (this.cwd) {
      let records: TrustAuditRecord[];
      try {
        records = loadAuditLog(this.cwd);
      } catch (e) {
        securityLog('AUDIT_CHAIN_BROKEN', { phase: 'load', message: (e as Error).message });
        throw e;
      }
      let meta: ReturnType<typeof readAuditMeta>;
      try {
        meta = readAuditMeta(this.cwd);
      } catch (e) {
        securityLog('AUDIT_META_MISMATCH', { phase: 'read_meta', message: (e as Error).message });
        throw e;
      }
      try {
        assertAuditMetaConsistent(records, meta);
      } catch (e) {
        securityLog('AUDIT_META_MISMATCH', { message: (e as Error).message });
        throw e;
      }
      if (!this.verifyChainInternal(records, { deep: false })) {
        securityLog('AUDIT_CHAIN_BROKEN', { phase: 'startup_verify' });
        throw new Error('AUDIT_CHAIN_BROKEN: hash chain invalid on load');
      }
      this.records.push(...records);
    }
  }

  /**
   * Disk-first: append line + meta, then memory. Signing (if configured) after chain hash, never part of recordHash.
   */
  append(record: TrustAuditRecord): void {
    const prev = this.records.length > 0 ? this.records[this.records.length - 1]! : null;
    let chained = chainAuditRecord(prev, record);
    if (this.auditKeyProvider?.signSync) {
      const sig = signAuditRecordWithProviderSync(chained, this.auditKeyProvider);
      chained = { ...chained, signature: sig };
    } else if (this.signingSecret && this.signerNodeId) {
      const sig = signAuditRecord(chained, this.signingSecret);
      chained = { ...chained, signature: sig };
    }
    if (this.cwd) {
      appendAuditRecord(this.cwd, chained);
      writeAuditMeta(this.cwd, {
        lastRecordHash: chained.recordHash,
        totalRecords: this.records.length + 1,
      });
    }
    this.records.push(chained);
  }

  /**
   * Append an exact audit row verified externally (e.g. Merkle proof + protocol).
   * Does not re-chain or re-sign; enforces hash chain continuity only.
   */
  appendReplica(record: TrustAuditRecord): void {
    const prev = this.records.length > 0 ? this.records[this.records.length - 1]! : null;
    if (prev) {
      if (record.previousRecordHash !== prev.recordHash) {
        throw new Error('SYNC_CHAIN_MISMATCH: previousRecordHash does not match local tip');
      }
    } else if (record.previousRecordHash !== undefined && record.previousRecordHash !== '') {
      throw new Error('SYNC_CHAIN_MISMATCH: first record must not claim previous hash');
    }
    if (!this.verifyRecordHash(record)) {
      throw new Error('SYNC_INVALID_RECORD_HASH');
    }
    if (this.cwd) {
      appendAuditRecord(this.cwd, record);
      writeAuditMeta(this.cwd, {
        lastRecordHash: record.recordHash,
        totalRecords: this.records.length + 1,
      });
    }
    this.records.push(record);
  }

  getAll(): TrustAuditRecord[] {
    return [...this.records];
  }

  getByNode(nodeId: string): TrustAuditRecord[] {
    return this.records.filter((r) => r.nodeId === nodeId || r.issuer === nodeId);
  }

  verifyRecord(record: TrustAuditRecord, opts?: AuditVerifyOptions): boolean {
    if (!this.verifyRecordHash(record)) return false;
    if (opts?.deep && !this.verifyRecordDeep(record, opts)) return false;
    return true;
  }

  private verifyRecordHash(record: TrustAuditRecord): boolean {
    const { recordHash, ...forHash } = record;
    const expected = computeAuditRecordHash(forHash);
    return expected === recordHash;
  }

  private verifyRecordDeep(record: TrustAuditRecord, opts: AuditVerifyOptions): boolean {
    if (record.signature && record.signerNodeId) {
      const sec = opts.resolveSignerSecret?.(record.signerNodeId);
      if (!sec || !verifyAuditRecordSignature(record, sec)) {
        securityLog('AUDIT_SIGNATURE_INVALID', { recordId: record.recordId, signerNodeId: record.signerNodeId });
        return false;
      }
    }
    if (record.eventPayload !== undefined && record.eventSignature) {
      const issuerSec = opts.resolveIssuerSecret?.(record.issuer);
      if (!issuerSec) {
        securityLog('AUDIT_SIGNATURE_INVALID', { phase: 'issuer_secret_missing', issuer: record.issuer });
        return false;
      }
      const te = toTrustEvent(record);
      if (!verifyTrustEvent(te, issuerSec)) return false;
    }
    const ends = record.endorsements ?? [];
    if (ends.length > 0) {
      if (!opts.resolveEndorserSecret) return false;
      const payload = endorsementPayload(record);
      for (const e of ends) {
        const sec = opts.resolveEndorserSecret(e.nodeId);
        if (!sec || !verifySignature(sec, payload, e.signature)) return false;
      }
    }
    return true;
  }

  /** Ordered record hashes (Merkle leaves). */
  getRecordHashes(): string[] {
    return this.records.map((r) => r.recordHash);
  }

  getMerkleRoot(): string {
    const hashes = this.getRecordHashes();
    if (hashes.length === 0) return emptyMerkleLeafHash();
    return rootFromTree(buildMerkleTree(hashes));
  }

  getMerkleTree(): MerkleNode {
    const hashes = this.getRecordHashes();
    if (hashes.length === 0) {
      return { hash: emptyMerkleLeafHash() };
    }
    return buildMerkleTree(hashes);
  }

  getProofForRecord(index: number): MerkleProof {
    const hashes = this.getRecordHashes();
    if (!Number.isInteger(index) || index < 0 || index >= hashes.length) {
      throw new Error('MERKLE_BAD_INDEX');
    }
    return generateMerkleProof(hashes, index);
  }

  verifyChain(opts?: AuditVerifyOptions): boolean {
    return this.verifyChainInternal(this.records, opts);
  }

  private verifyChainInternal(records: TrustAuditRecord[], opts?: AuditVerifyOptions): boolean {
    let prev: TrustAuditRecord | null = null;
    for (const rec of records) {
      if (!this.verifyRecordHash(rec)) {
        securityLog('AUDIT_CHAIN_BROKEN', { recordId: rec.recordId });
        return false;
      }
      if ((prev?.recordHash ?? undefined) !== rec.previousRecordHash) {
        securityLog('AUDIT_CHAIN_BROKEN', { recordId: rec.recordId, reason: 'previous_hash' });
        return false;
      }
      if (opts?.deep && !this.verifyRecordDeep(rec, opts)) return false;
      prev = rec;
    }
    return true;
  }
}

/** Best-effort summary for observability (does not throw). */
export function tryAuditSummary(
  cwd: string,
  verifyOpts?: AuditVerifyOptions,
): {
  totalRecords: number;
  chainValid: boolean;
  lastRecordHash: string;
  merkleRoot: string;
} | undefined {
  try {
    const log = new AuditLog({ cwd });
    const all = log.getAll();
    return {
      totalRecords: all.length,
      chainValid: log.verifyChain(verifyOpts),
      lastRecordHash: all.length > 0 ? all[all.length - 1]!.recordHash : '',
      merkleRoot: log.getMerkleRoot(),
    };
  } catch {
    return undefined;
  }
}
