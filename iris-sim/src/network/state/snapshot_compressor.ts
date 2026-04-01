/**
 * Phase 14B — Snapshot Engine. Deterministic gzip compression.
 */

import { gzipSync, gunzipSync } from 'node:zlib';

/** Compress payload (gzip). Same input → same output. */
export class SnapshotCompressor {
  static compress(payload: string): string {
    const buf = Buffer.from(payload, 'utf8');
    const compressed = gzipSync(buf, { level: 6 });
    return compressed.toString('base64');
  }

  static decompress(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const decompressed = gunzipSync(buf);
    return decompressed.toString('utf8');
  }
}
