// Phase 14.2 — Certification evidence index tests.

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/boundary/core_certification_scope.dart';
import 'package:iris_flutter_app/certification/boundary/core_certification_scope_serializer.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index_hash.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index_serializer.dart';

/// Expected Phase 13 evidence ids (order fixed).
const List<String> phase13Ids = [
  'structural_hash_snapshot',
  'freeze_artifact',
  'immutable_stamp',
  'cryptographic_freeze_seal',
  'audit_chain_root',
  'reproducible_build_fingerprint',
  'binary_provenance',
  'external_audit_bundle',
  'core_certification_snapshot',
];

/// Expected Phase 14.1 evidence id.
const String phase141Id = 'core_certification_scope_serialization_hash';

/// Forbidden normative terms (case-insensitive).
const List<String> forbiddenNormativeTerms = [
  'compliant',
  'certified',
  'approved',
  'regulation',
  'legal',
  'meets',
  'guarantees',
  'ensures',
  'therefore',
];

/// Tokens that must not appear in index/serializer/hash lib (immutability).
const List<String> forbiddenRuntimeTokens = [
  'DateTime',
  'Random',
  'Timer',
  'dart:io',
  'Platform.',
  'environment',
  'env[',
];

void main() {
  group('1. Completezza evidenze', () {
    test('all Phase 13 evidences present in fixed order', () {
      final entries = certificationEvidenceIndex.entries;
      expect(entries.length, greaterThanOrEqualTo(phase13Ids.length));
      for (var i = 0; i < phase13Ids.length; i++) {
        expect(entries[i].id, equals(phase13Ids[i]));
        expect(entries[i].sourcePhase.startsWith('13.'), isTrue);
      }
    });

    test('Phase 14.1 evidence present', () {
      final with141 = certificationEvidenceIndex.entries
          .where((e) => e.sourcePhase == '14.1')
          .toList();
      expect(with141.length, equals(1));
      expect(with141.single.id, equals(phase141Id));
    });

    test('exactly 10 entries, no extra', () {
      expect(certificationEvidenceIndex.entries.length, equals(10));
    });

    test('Phase 14.1 entry sha256 equals scope serialization hash', () {
      final scopeSerialized =
          serializeCoreCertificationScope(coreCertificationScope);
      final expectedScopeHash = _sha256(scopeSerialized);
      final entry141 = certificationEvidenceIndex.entries
          .where((e) => e.sourcePhase == '14.1')
          .single;
      expect(entry141.sha256, equals(expectedScopeHash));
    });
  });

  group('2. Determinismo serializzazione', () {
    test('two serializations produce same string', () {
      final a =
          serializeCertificationEvidenceIndex(certificationEvidenceIndex);
      final b =
          serializeCertificationEvidenceIndex(certificationEvidenceIndex);
      expect(a, equals(b));
    });

    test('two hashes produce same SHA-256', () {
      final h1 =
          computeCertificationEvidenceIndexSha256(certificationEvidenceIndex);
      final h2 =
          computeCertificationEvidenceIndexSha256(certificationEvidenceIndex);
      expect(h1, equals(h2));
      expect(h1.length, equals(64));
      expect(RegExp(r'^[a-f0-9]{64}$').hasMatch(h1), isTrue);
    });
  });

  group('3. Stabilità hash', () {
    test('index hash is stable and 64-char hex', () {
      final h =
          computeCertificationEvidenceIndexSha256(certificationEvidenceIndex);
      expect(h.length, equals(64));
      expect(RegExp(r'^[a-f0-9]{64}$').hasMatch(h), isTrue);
      final h2 =
          computeCertificationEvidenceIndexSha256(certificationEvidenceIndex);
      expect(h, equals(h2));
    });
  });

  group('4. Assenza linguaggio normativo', () {
    test('no forbidden terms in id, description, sourcePhase', () {
      for (final e in certificationEvidenceIndex.entries) {
        _assertNoForbiddenTerm(e.id);
        _assertNoForbiddenTerm(e.description);
        _assertNoForbiddenTerm(e.sourcePhase);
      }
    });
  });

  group('5. Immutabilità strutturale', () {
    test('index and serializer and hash libs do not use DateTime/Random/Timer/IO/env', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/evidence/certification_evidence_index.dart',
        '$dir/lib/certification/evidence/certification_evidence_index_serializer.dart',
        '$dir/lib/certification/evidence/certification_evidence_index_hash.dart',
      ];
      for (final path in libPaths) {
        final content = File(path).readAsStringSync();
        for (final token in forbiddenRuntimeTokens) {
          expect(
            content.contains(token),
            isFalse,
            reason: '$path must not contain $token',
          );
        }
      }
    });

    test('EvidenceEntry and CertificationEvidenceIndex have final fields and const constructor', () {
      final path =
          '${Directory.current.path}/lib/certification/evidence/certification_evidence_index.dart';
      final content = File(path).readAsStringSync();
      expect(content.contains('final String id'), isTrue);
      expect(content.contains('final String description'), isTrue);
      expect(content.contains('final String sha256'), isTrue);
      expect(content.contains('final String sourcePhase'), isTrue);
      expect(content.contains('final List<EvidenceEntry> entries'), isTrue);
      expect(content.contains('const EvidenceEntry('), isTrue);
      expect(content.contains('const CertificationEvidenceIndex('), isTrue);
    });
  });
}

String _sha256(String s) {
  final bytes = utf8.encode(s);
  return sha256.convert(bytes).toString();
}

void _assertNoForbiddenTerm(String text) {
  final lower = text.toLowerCase();
  for (final term in forbiddenNormativeTerms) {
    expect(
      lower.contains(term),
      isFalse,
      reason: 'Text must not contain normative term "$term": $text',
    );
  }
}
