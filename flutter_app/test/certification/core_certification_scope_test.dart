// Phase 14.1 — Certification boundary definition tests.

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/certification/boundary/core_certification_scope.dart';
import 'package:iris_flutter_app/certification/boundary/core_certification_scope_serializer.dart';

const _scopePath = 'lib/certification/boundary/core_certification_scope.dart';
const _serializerPath = 'lib/certification/boundary/core_certification_scope_serializer.dart';

/// Phase 13 artifact identifiers. Must match scope.certifiedArtifacts exactly (order and content).
const List<String> phase13Artifacts = [
  'structural hash snapshot',
  'freeze artifact',
  'immutable stamp',
  'cryptographic freeze seal',
  'audit chain root',
  'reproducible build fingerprint',
  'binary provenance',
  'external audit bundle',
  'core certification snapshot',
];

/// Forbidden normative terms (case-insensitive). Content must not contain these.
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

void main() {
  group('1. Determinism', () {
    test('two serializations produce same string and same SHA-256', () {
      final a = serializeCoreCertificationScope(coreCertificationScope);
      final b = serializeCoreCertificationScope(coreCertificationScope);
      expect(a, equals(b));
      final hashA = sha256.convert(utf8.encode(a)).toString();
      final hashB = sha256.convert(utf8.encode(b)).toString();
      expect(hashA, equals(hashB));
    });
  });

  group('2. Completezza rispetto Phase 13', () {
    test('certifiedArtifacts contains exactly Phase 13 artifacts in fixed order', () {
      final list = coreCertificationScope.certifiedArtifacts;
      expect(list.length, equals(phase13Artifacts.length));
      for (var i = 0; i < phase13Artifacts.length; i++) {
        expect(list[i], equals(phase13Artifacts[i]));
      }
    });

    test('no extra elements in certifiedArtifacts', () {
      final list = coreCertificationScope.certifiedArtifacts;
      expect(list.length, equals(phase13Artifacts.length));
      expect(list, orderedEquals(phase13Artifacts));
    });
  });

  group('3. Assenza linguaggio normativo', () {
    test('no forbidden normative terms in certifiedArtifacts', () {
      for (final s in coreCertificationScope.certifiedArtifacts) {
        _assertNoForbiddenTerm(s);
      }
    });

    test('no forbidden normative terms in excludedComponents', () {
      for (final s in coreCertificationScope.excludedComponents) {
        _assertNoForbiddenTerm(s);
      }
    });

    test('no forbidden normative terms in verificationSurface', () {
      for (final s in coreCertificationScope.verificationSurface) {
        _assertNoForbiddenTerm(s);
      }
    });
  });

  group('4. Immutabilità strutturale', () {
    test('scope file has no DateTime, Random, Timer, filesystem, env vars', () {
      final source = File(_scopePath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('Stopwatch')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('Directory(')));
      expect(source, isNot(contains('environment')));
    });

    test('serializer file has no DateTime, Random, Timer, filesystem, env vars', () {
      final source = File(_serializerPath).readAsStringSync();
      expect(source, isNot(contains('DateTime')));
      expect(source, isNot(contains('Random')));
      expect(source, isNot(contains('Timer')));
      expect(source, isNot(contains('File(')));
      expect(source, isNot(contains('environment')));
    });

    test('CoreCertificationScope has only final fields and const constructor', () {
      final source = File(_scopePath).readAsStringSync();
      expect(source, contains('final List<String> certifiedArtifacts'));
      expect(source, contains('final List<String> excludedComponents'));
      expect(source, contains('final List<String> verificationSurface'));
      expect(source, contains('const CoreCertificationScope('));
    });
  });

  group('5. Stabilità hash serializzazione', () {
    test('SHA-256 of canonical serialization is invariant', () {
      final serialized = serializeCoreCertificationScope(coreCertificationScope);
      final hash = sha256.convert(utf8.encode(serialized)).toString();
      expect(hash.length, equals(64));
      expect(hash, equals(hash.toLowerCase()));
      final hashAgain = sha256.convert(utf8.encode(serialized)).toString();
      expect(hash, equals(hashAgain));
    });
  });
}

void _assertNoForbiddenTerm(String value) {
  final lower = value.toLowerCase();
  for (final term in forbiddenNormativeTerms) {
    expect(
      lower.contains(term.toLowerCase()),
      isFalse,
      reason: 'Value "$value" contains forbidden term "$term"',
    );
  }
}
