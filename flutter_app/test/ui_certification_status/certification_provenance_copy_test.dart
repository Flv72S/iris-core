// Microstep 12.6 — Certification Provenance Copy tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_provenance_copy.dart';

const _forbiddenTerms = [
  'compliant',
  'certified',
  'approved',
  'regulation',
  'legal',
  'ai act',
  'eu',
  'law',
  'meets',
  'satisfies',
  'conforms',
  'trustworthy',
  'safe',
  'reliable',
  'validated',
];

const _forbiddenInExplanation = ['means', 'ensures', 'guarantees', 'therefore'];

void main() {
  group('5.1 Registry completeness', () {
    test('every CertificationCapability has an entry in the registry', () {
      for (final cap in CertificationCapability.values) {
        expect(
          certificationProvenanceRegistry.containsKey(cap.code),
          isTrue,
          reason: 'missing entry for ${cap.code}',
        );
        final copy = provenanceFor(cap.code);
        expect(copy.capabilityCode, equals(cap.code));
      }
      expect(
        certificationProvenanceRegistry.length,
        equals(CertificationCapability.values.length),
        reason: 'no extra entries',
      );
    });
  });

  group('5.2 Determinism', () {
    test('two lookups for same capability return equal object and same hashCode', () {
      for (final cap in CertificationCapability.values) {
        final a = provenanceFor(cap.code);
        final b = provenanceFor(cap.code);
        expect(a, equals(b));
        expect(a.hashCode, equals(b.hashCode));
      }
    });
  });

  group('5.3 Forbidden terms guard', () {
    test('no string in explanation or derivedFrom contains forbidden terms', () {
      for (final copy in certificationProvenanceRegistry.values) {
        final explanationLower = copy.explanation.toLowerCase();
        for (final term in _forbiddenTerms) {
          expect(
            explanationLower.contains(term),
            isFalse,
            reason: 'explanation must not contain "$term": ${copy.capabilityCode}',
          );
        }
        for (final s in copy.derivedFrom) {
          final lower = s.toLowerCase();
          for (final term in _forbiddenTerms) {
            expect(
              lower.contains(term),
              isFalse,
              reason: 'derivedFrom must not contain "$term": $s',
            );
          }
        }
      }
    });
  });

  group('5.4 No runtime logic', () {
    test('file does not contain DateTime, Random, Stopwatch, Timer', () {
      final file = File('lib/ui/certification_status/certification_provenance_copy.dart');
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), isFalse);
      expect(content.contains('Random'), isFalse);
      expect(content.contains('Stopwatch'), isFalse);
      expect(content.contains('Timer'), isFalse);
    });

    test('provenanceFor with unknown code throws ArgumentError', () {
      expect(
        () => provenanceFor('unknown_capability'),
        throwsArgumentError,
      );
    });
  });

  group('5.5 Pure explanation', () {
    test('explanation does not contain means, ensures, guarantees, therefore', () {
      for (final copy in certificationProvenanceRegistry.values) {
        final explanationLower = copy.explanation.toLowerCase();
        for (final term in _forbiddenInExplanation) {
          expect(
            explanationLower.contains(term),
            isFalse,
            reason: 'explanation must not contain "$term": ${copy.capabilityCode}',
          );
        }
      }
    });
  });
}
