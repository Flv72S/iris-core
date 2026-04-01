export interface AuditMeta {
  lastRecordHash: string;
  totalRecords: number;
}

export function assertAuditMetaConsistent(records: Array<{ recordHash: string }>, meta: AuditMeta | null): void {
  if (meta == null) return;
  if (meta.totalRecords !== records.length) {
    throw new Error(
      `AUDIT_META_MISMATCH: totalRecords=${meta.totalRecords} diskLines=${records.length}`,
    );
  }
  if (records.length > 0) {
    const last = records[records.length - 1]!;
    if (meta.lastRecordHash !== last.recordHash) {
      throw new Error(`AUDIT_META_MISMATCH: lastRecordHash does not match last record`);
    }
  }
}
