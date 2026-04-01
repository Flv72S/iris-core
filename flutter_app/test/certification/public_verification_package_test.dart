// Phase 14.4 — Public verification package tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index.dart';
import 'package:iris_flutter_app/certification/evidence/certification_evidence_index_hash.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest.dart';
import 'package:iris_flutter_app/certification/public/public_certification_manifest_serializer.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_builder.dart';
import 'package:iris_flutter_app/certification/public/public_verification_package_hash.dart';

/// Forbidden normative terms (case-insensitive).
const List<String> forbiddenNormativeTerms = [
  'compliant',
  'certified',
  'approved',
  'regulation',
  'legal',
  'guarantees',
  'ensures',
  'therefore',
  'meets',
];

/// Tokens that must not appear in package lib (runtime independence).
const List<String> forbiddenRuntimeTokens = [
  'DateTime',
  'Random',
  'Timer',
  'dart:io',
  'Platform.',
  'env[',
  'Socket',
  'HttpClient',
  'Network',
  'File(',
  'Directory(',
  'File.',
  'Directory.',
];

void main() {
  late Map<String, String> packageA;
  late Map<String, String> packageB;

  setUpAll(() {
    const builder = PublicVerificationPackageBuilder();
    packageA = builder.buildPackageFiles();
    packageB = builder.buildPackageFiles();
  });

  group('1. Deterministic build', () {
    test('two buildPackageFiles() produce same map keys', () {
      expect(packageA.keys.toList()..sort(), equals(packageB.keys.toList()..sort()));
    });

    test('two buildPackageFiles() produce same content per file', () {
      expect(packageA.length, equals(14));
      for (final k in packageA.keys) {
        expect(packageA[k], equals(packageB[k]), reason: k);
      }
    });

    test('PACKAGE_SHA256 is identical between two builds', () {
      expect(packageA['PACKAGE_SHA256.txt'], equals(packageB['PACKAGE_SHA256.txt']));
      expect(packageA['PACKAGE_SHA256.txt']!.length, equals(64));
      expect(
        RegExp(r'^[a-f0-9]{64}$').hasMatch(packageA['PACKAGE_SHA256.txt']!),
        isTrue,
      );
    });
  });

  group('2. Manifest integrity', () {
    test('public_certification_manifest.json equals Phase 14.3 serialization', () {
      final expected =
          serializePublicCertificationManifest(publicCertificationManifest);
      expect(packageA['public_certification_manifest.json'], equals(expected));
    });
  });

  group('3. Hash coherence', () {
    test('core_structural_hash.txt matches manifest.coreStructuralHash', () {
      expect(
        packageA['core_structural_hash.txt'],
        equals(publicCertificationManifest.coreStructuralHash),
      );
    });

    test('certification_scope_hash.txt matches manifest.certificationScopeHash', () {
      expect(
        packageA['certification_scope_hash.txt'],
        equals(publicCertificationManifest.certificationScopeHash),
      );
    });

    test('evidence_index_hash.txt matches manifest.evidenceIndexHash', () {
      expect(
        packageA['evidence_index_hash.txt'],
        equals(publicCertificationManifest.evidenceIndexHash),
      );
    });

    test('evidence_index_hash matches Phase 14.2 index hash', () {
      final expected =
          computeCertificationEvidenceIndexSha256(certificationEvidenceIndex);
      expect(packageA['evidence_index_hash.txt'], equals(expected));
    });

    test('PACKAGE_SHA256.txt equals hash of package files excluding itself', () {
      final filesWithoutHash = Map<String, String>.from(packageA)
        ..remove('PACKAGE_SHA256.txt');
      final expected = computePublicVerificationPackageSha256(filesWithoutHash);
      expect(packageA['PACKAGE_SHA256.txt'], equals(expected));
    });
  });

  group('4. Filename ordering stability', () {
    test('package hash is independent of map insertion order', () {
      final filesWithoutHash = Map<String, String>.from(packageA)
        ..remove('PACKAGE_SHA256.txt');
      final hash1 = computePublicVerificationPackageSha256(filesWithoutHash);

      final reversedKeys = filesWithoutHash.keys.toList().reversed.toList();
      final reordered = <String, String>{};
      for (final k in reversedKeys) {
        reordered[k] = filesWithoutHash[k]!;
      }
      final hash2 = computePublicVerificationPackageSha256(reordered);

      expect(hash1, equals(hash2));
    });
  });

  group('5. Forbidden normative language', () {
    test('no forbidden terms in any package file content', () {
      for (final entry in packageA.entries) {
        _assertNoForbiddenTerm(entry.value);
      }
    });
  });

  group('6. Runtime independence', () {
    test('builder and hash libs do not use DateTime/Random/Timer/IO/filesystem/network/env', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/public/public_verification_package_builder.dart',
        '$dir/lib/certification/public/public_verification_package_hash.dart',
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
      reason: 'Content must not contain normative term "$term"',
    );
  }
}
