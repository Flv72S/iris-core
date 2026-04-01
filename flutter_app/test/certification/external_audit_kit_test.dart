// Phase 14.6 — External audit kit tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/external_audit/external_audit_kit_content.dart';
import 'package:iris_flutter_app/certification/external_audit/external_audit_kit_validator.dart';

const _kitDir = 'certification/external_audit_kit';

const _requiredFiles = [
  'README_AUDIT.md',
  'EXECUTION_STEPS.txt',
  'VERIFY_HASHES.txt',
  'EXPECTED_RESULTS.txt',
  'FAILURE_MODES.txt',
  'kit_version.txt',
  'scripts/deterministic_verify.sh',
  'external_audit_reproducibility_proof.json',
];

const _requiredReadmeSections = [
  '## 1. Purpose',
  '## 2. Contained Artifacts',
  '## 3. Execution Context',
  '## 4. Deterministic Verification Flow',
  '## 5. Interpretation Boundary',
];

const _forbiddenNormativeTerms = [
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

const _forbiddenRuntimeTokens = [
  'DateTime',
  'Random',
  'dart:io',
  'Platform.',
  'Socket',
  'HttpClient',
  'Network',
];

void main() {
  group('1. Kit completeness', () {
    test('all required files exist', () {
      expect(Directory(_kitDir).existsSync(), isTrue);
      expect(Directory('$_kitDir/scripts').existsSync(), isTrue);
      for (final name in _requiredFiles) {
        final file = File('$_kitDir/$name');
        expect(file.existsSync(), isTrue, reason: name);
      }
    });

    test('README_AUDIT.md contains all required sections', () {
      final content = File('$_kitDir/README_AUDIT.md').readAsStringSync();
      for (final section in _requiredReadmeSections) {
        expect(content.contains(section), isTrue, reason: section);
      }
    });
  });

  group('2. Deterministic reproducibility', () {
    test('two buildExternalAuditKitFiles() produce identical maps', () {
      final a = buildExternalAuditKitFiles();
      final b = buildExternalAuditKitFiles();
      expect(a.length, equals(b.length));
      expect(a.keys.toSet(), equals(b.keys.toSet()));
      for (final k in a.keys) {
        expect(a[k], equals(b[k]), reason: k);
      }
    });
  });

  group('3. Validator correctness', () {
    test('validator returns true with correct hashes', () {
      const validator = ExternalAuditKitValidator();
      final correct = getExpectedAuditKitHashes();
      expect(validator.verifyExpectedResults(correct), isTrue);
    });

    test('validator returns false when one value is wrong', () {
      const validator = ExternalAuditKitValidator();
      final wrong = Map<String, String>.from(getExpectedAuditKitHashes());
      wrong['PACKAGE_SHA256'] = '0' * 64;
      expect(validator.verifyExpectedResults(wrong), isFalse);
    });

    test('validator returns false when key is missing', () {
      const validator = ExternalAuditKitValidator();
      final incomplete = Map<String, String>.from(getExpectedAuditKitHashes());
      incomplete.remove('BUILD_FINGERPRINT');
      expect(validator.verifyExpectedResults(incomplete), isFalse);
    });
  });

  group('4. Forbidden normative language', () {
    test('no forbidden terms in kit file contents', () {
      final files = buildExternalAuditKitFiles();
      for (final entry in files.entries) {
        _assertNoForbiddenTerm(entry.value);
      }
    });
  });

  group('5. Runtime independence', () {
    test('validator and content libs do not use DateTime/Random/network/env/IO', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/external_audit/external_audit_kit_validator.dart',
        '$dir/lib/certification/external_audit/external_audit_kit_content.dart',
      ];
      for (final path in libPaths) {
        final content = File(path).readAsStringSync();
        for (final token in _forbiddenRuntimeTokens) {
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
  for (final term in _forbiddenNormativeTerms) {
    expect(
      lower.contains(term),
      isFalse,
      reason: 'Content must not contain normative term "$term"',
    );
  }
}
