import { describe, expect, it } from 'vitest';

import type { ComplianceDecision } from '../../src/distributed/cluster_compliance_engine';
import {
  decodeAndValidateDecision,
  encodeCanonicalMessage,
  MessageCodecError,
  parseInboundJson,
} from '../../src/runtime/network/message_codec';
import {
  applyPayloadCorruption,
  partialJsonTruncate,
  tamperDecisionWithFakeId,
} from '../../src/runtime/ops/network_tools';
import { ByzantineNode } from '../../src/runtime/simulation/byzantine_node';

const sampleDecision: ComplianceDecision = Object.freeze({
  severity: 'WARNING',
  action: 'LOG_ONLY',
  reasons: Object.freeze(['a']),
  invariantIds: Object.freeze(['i1']),
  violationCount: 0,
  timestamp: 42,
});

describe('Byzantine boundary — message_codec', () => {
  it('rejects unknown top-level fields (fake decisionId)', () => {
    const forged = tamperDecisionWithFakeId(sampleDecision);
    expect(() => decodeAndValidateDecision(forged)).toThrow(MessageCodecError);
    try {
      decodeAndValidateDecision(forged);
    } catch (e) {
      expect(e).toBeInstanceOf(MessageCodecError);
      expect((e as MessageCodecError).kind).toBe('invalid');
    }
  });

  it('rejects invalid JSON with corrupt kind', () => {
    expect(() => decodeAndValidateDecision('{"severity":')).toThrow(MessageCodecError);
    try {
      decodeAndValidateDecision('not-json');
    } catch (e) {
      expect((e as MessageCodecError).kind).toBe('corrupt');
    }
  });

  it('rejects invalid action', () => {
    const n = new ByzantineNode('x', 'INVALID_ACTION', 1);
    const bad = n.inject(sampleDecision);
    expect(bad).not.toBeNull();
    expect(() => decodeAndValidateDecision(bad)).toThrow(MessageCodecError);
  });

  it('accepts minimal valid decision', () => {
    const d = decodeAndValidateDecision(sampleDecision);
    expect(d.severity).toBe('WARNING');
    expect(d.timestamp).toBe(42);
  });

  it('parseInboundJson treats null as corrupt', () => {
    expect(() => parseInboundJson(null)).toThrow(MessageCodecError);
  });
});

describe('Byzantine boundary — network_tools corruption', () => {
  it('truncate yields unparseable JSON often', () => {
    const json = encodeCanonicalMessage(sampleDecision);
    const cut = partialJsonTruncate(json, () => 0.01, 1);
    expect(cut.length).toBeLessThan(json.length);
    expect(() => JSON.parse(cut)).toThrow();
  });

  it('applyPayloadCorruption may break JSON or add invalid fields', () => {
    const json = encodeCanonicalMessage(sampleDecision);
    const out = applyPayloadCorruption(json, {
      seed: 777,
      corruptionRate: 1,
      truncateRate: 1,
      injectInvalidFieldRate: 1,
    });
    const invalid =
      ((): boolean => {
        try {
          const o = JSON.parse(out) as Record<string, unknown>;
          return 'severity' in o && '__byzantine_probe' in o;
        } catch {
          return true;
        }
      })();
    expect(invalid).toBe(true);
  });
});
