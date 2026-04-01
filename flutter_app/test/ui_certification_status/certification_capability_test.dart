// Microstep 12.2 — Certification Capability enum: closed, declarative, tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';

const _forbiddenTerms = [
  'compliant',
  'certified',
  'approved',
  'meets',
  'regulation',
  'ai act',
];

void main() {
  group('6.1 Code stability', () {
    test('every enum value has non-empty code', () {
      for (final c in CertificationCapability.values) {
        expect(c.code.isNotEmpty, isTrue, reason: '${c.name} must have non-empty code');
      }
    });

    test('all codes are unique', () {
      final codes = CertificationCapability.values.map((c) => c.code).toList();
      final unique = codes.toSet();
      expect(unique.length, equals(codes.length), reason: 'codes must be unique');
    });
  });

  group('6.2 Round-trip code', () {
    test('capability → code → fromCode → equals original', () {
      for (final cap in CertificationCapability.values) {
        final restored = CertificationCapability.fromCode(cap.code);
        expect(restored, equals(cap));
      }
    });
  });

  group('6.3 Unknown code', () {
    test('fromCode("unknown_capability") throws ArgumentError', () {
      expect(
        () => CertificationCapability.fromCode('unknown_capability'),
        throwsArgumentError,
      );
    });
  });

  group('6.4 Determinism guard', () {
    test('certification_capability.dart does not use DateTime, Random, Stopwatch, Timer', () {
      final file = File('lib/ui/certification_status/certification_capability.dart');
      expect(file.existsSync(), isTrue);
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), isFalse, reason: 'no DateTime');
      expect(content.contains('Random'), isFalse, reason: 'no Random');
      expect(content.contains('Stopwatch'), isFalse, reason: 'no Stopwatch');
      expect(content.contains('Timer'), isFalse, reason: 'no Timer');
    });
  });

  group('6.5 Forbidden terms guard', () {
    test('enum names and code strings contain no forbidden terms', () {
      for (final c in CertificationCapability.values) {
        final nameLower = c.name.toLowerCase();
        final codeLower = c.code.toLowerCase();
        for (final term in _forbiddenTerms) {
          expect(
            nameLower.contains(term),
            isFalse,
            reason: 'enum name must not contain "$term": ${c.name}',
          );
          expect(
            codeLower.contains(term),
            isFalse,
            reason: 'code must not contain "$term": ${c.code}',
          );
        }
      }
    });
  });
}
