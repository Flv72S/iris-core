// Phase 14.5 — Independent reproducibility protocol tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/independent/independent_reproducibility_protocol_content.dart';
import 'package:iris_flutter_app/certification/independent/independent_reproducibility_validator.dart';

const _protocolDir = 'certification/independent_reproducibility';

const _requiredFiles = [
  'reproducibility_protocol.md',
  'reproducibility_steps.txt',
  'expected_hashes.txt',
  'verification_commands.txt',
  'failure_conditions.txt',
  'protocol_version.txt',
];

const _requiredMdSections = [
  '## 1. Purpose',
  '## 2. Required Inputs',
  '## 3. Deterministic Reconstruction Procedure',
  '## 4. Expected Outputs',
  '## 5. Failure Conditions',
  '## 6. Reproducibility Properties (Technical)',
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
  group('1. Protocol completeness', () {
    test('all required files exist', () {
      final dir = Directory(_protocolDir);
      expect(dir.existsSync(), isTrue);
      for (final name in _requiredFiles) {
        final file = File('$_protocolDir/$name');
        expect(file.existsSync(), isTrue, reason: name);
      }
    });

    test('reproducibility_protocol.md contains all required sections', () {
      final content = File('$_protocolDir/reproducibility_protocol.md').readAsStringSync();
      for (final section in _requiredMdSections) {
        expect(content.contains(section), isTrue, reason: section);
      }
    });
  });

  group('2. Deterministic content', () {
    test('two buildProtocolFiles() produce identical maps', () {
      final a = buildProtocolFiles();
      final b = buildProtocolFiles();
      expect(a.length, equals(b.length));
      expect(a.keys.toSet(), equals(b.keys.toSet()));
      for (final k in a.keys) {
        expect(a[k], equals(b[k]), reason: k);
      }
    });

    test('built content matches expected hash format', () {
      final files = buildProtocolFiles();
      final expectedHashes = files['expected_hashes.txt']!;
      for (final key in expectedReproducibilityHashKeys) {
        expect(expectedHashes.contains('$key='), isTrue);
      }
    });
  });

  group('3. Expected hashes validation', () {
    test('validator returns true with correct values', () {
      const validator = IndependentReproducibilityValidator();
      final correct = getExpectedReproducibilityHashes();
      expect(validator.verifyExpectedHashes(correct), isTrue);
    });

    test('validator returns false when one value is wrong', () {
      const validator = IndependentReproducibilityValidator();
      final wrong = Map<String, String>.from(getExpectedReproducibilityHashes());
      wrong['STRUCTURAL_HASH'] = '0' * 64;
      expect(validator.verifyExpectedHashes(wrong), isFalse);
    });

    test('validator returns false when key is missing', () {
      const validator = IndependentReproducibilityValidator();
      final incomplete = Map<String, String>.from(getExpectedReproducibilityHashes());
      incomplete.remove('PACKAGE_SHA256');
      expect(validator.verifyExpectedHashes(incomplete), isFalse);
    });
  });

  group('4. Forbidden normative language', () {
    test('no forbidden terms in protocol file contents', () {
      final files = buildProtocolFiles();
      for (final entry in files.entries) {
        _assertNoForbiddenTerm(entry.value);
      }
    });
  });

  group('5. Runtime independence', () {
    test('validator and protocol content libs do not use DateTime/Random/IO/network/env', () {
      final dir = Directory.current.path;
      final libPaths = [
        '$dir/lib/certification/independent/independent_reproducibility_validator.dart',
        '$dir/lib/certification/independent/independent_reproducibility_protocol_content.dart',
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
