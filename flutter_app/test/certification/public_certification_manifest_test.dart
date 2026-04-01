// Phase 14.3 — Public certification manifest tests.

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/boundary/core_certification_scope.dart';
import 'package:iris_flutter_app/certification/boundary/core_certification_scope_serializer.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index_hash.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest_hash.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest_serializer.dart';

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

/// Tokens that must not appear in manifest lib (runtime independence).
const List<String> forbiddenRuntimeTokens = [
  'DateTime',
  'Random',
  'Timer',
  'dart:io',
  'Platform.',
  'environment',
  'env[',
  'Socket',
  'HttpClient',
  'Network',
];

void main() {
  group('1. Deterministic serialization', () {
    test('two serializations produce same string', () {
      final a =
          serializePublicCertificationManifest(publicCertificationManifest);
      final b =
          serializePublicCertificationManifest(publicCertificationManifest);
      expect(a, equals(b));
    });

    test('two hashes produce same SHA-256', () {
      final h1 =
          computePublicCertificationManifestSha256(publicCertificationManifest);
      final h2 =
          computePublicCertificationManifestSha256(publicCertificationManifest);
      expect(h1, equals(h2));
      expect(h1.length, equals(64));
      expect(RegExp(r'^[a-f0-9]{64}$').hasMatch(h1), isTrue);
    });
  });

  group('2. Integrity linkage', () {
    test('coreStructuralHash matches Phase 13 structural hash', () {
      final phase13StructuralHash = certificationEvidenceIndex.entries
          .firstWhere((e) => e.id == 'structural_hash_snapshot')
          .sha256;
      expect(
        publicCertificationManifest.coreStructuralHash,
        equals(phase13StructuralHash),
      );
    });

    test('certificationScopeHash matches Phase 14.1 scope serialization hash',
        () {
      final scopeSerialized =
          serializeCoreCertificationScope(coreCertificationScope);
      final expectedScopeHash =
          sha256.convert(utf8.encode(scopeSerialized)).toString();
      expect(
        publicCertificationManifest.certificationScopeHash,
        equals(expectedScopeHash),
      );
    });

    test('evidenceIndexHash matches Phase 14.2 index hash', () {
      final expectedIndexHash =
          computeCertificationEvidenceIndexSha256(certificationEvidenceIndex);
      expect(
        publicCertificationManifest.evidenceIndexHash,
        equals(expectedIndexHash),
      );
    });
  });

  group('3. Evidence ordering stability', () {
    test('evidenceEntryIds has fixed order and no duplicates', () {
      final ids = publicCertificationManifest.evidenceEntryIds;
      final unique = ids.toSet();
      expect(unique.length, equals(ids.length), reason: 'No duplicates');
      expect(ids.length, equals(10));
    });

    test('evidenceEntryIds matches index entry order', () {
      final manifestIds = publicCertificationManifest.evidenceEntryIds;
      final indexIds = certificationEvidenceIndex.entries
          .map((e) => e.id)
          .toList();
      expect(manifestIds, orderedEquals(indexIds));
    });
  });

  group('4. Forbidden normative language', () {
    test('no forbidden terms in manifest string fields', () {
      final m = publicCertificationManifest;
      _assertNoForbiddenTerm(m.manifestVersion);
      _assertNoForbiddenTerm(m.generatedBy);
      for (final id in m.evidenceEntryIds) {
        _assertNoForbiddenTerm(id);
      }
    });
  });

  group('5. Runtime independence', () {
    test('manifest and serializer and hash libs do not use DateTime/Random/Timer/IO/env/network', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/public/public_certification_manifest.dart',
        '$dir/lib/certification/public/public_certification_manifest_serializer.dart',
        '$dir/lib/certification/public/public_certification_manifest_hash.dart',
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
  });
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
