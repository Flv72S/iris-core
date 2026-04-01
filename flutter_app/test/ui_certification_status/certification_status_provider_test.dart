// Microstep 12.3 — Certification Status Provider: read-only, deterministic.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status_provider.dart';

const _forbiddenTerms = [
  'compliant',
  'certified',
  'approved',
  'meets',
  'regulation',
  'ai act',
];

void main() {
  group('5.1 Deterministic snapshot', () {
    test('two provider instances yield equal status', () {
      final a = CertificationStatusProvider();
      final b = CertificationStatusProvider();
      expect(a.status, equals(b.status));
      expect(a.status.hashCode, equals(b.status.hashCode));
    });
  });

  group('5.2 Read-only guarantee', () {
    test('status is not modifiable from outside', () {
      final provider = CertificationStatusProvider();
      final status = provider.status;
      expect(status.version, isNotEmpty);
      expect(status.capabilities, isNotEmpty);
      expect(() => status.capabilities.add(CertificationCapability.deterministicReplay), throwsUnsupportedError);
    });

    test('provider source has no verify/check/evaluate/isCertified/isCompliant', () {
      final file = File('lib/ui/certification_status/certification_status_provider.dart');
      final content = file.readAsStringSync();
      final forbidden = ['verify', 'check', 'evaluate', 'isCertified', 'isCompliant'];
      for (final term in forbidden) {
        expect(content.contains(term), isFalse, reason: 'provider must not contain: $term');
      }
    });
  });

  group('5.3 Capability coherence', () {
    test('status capabilities match CertificationCapability enum exactly', () {
      final provider = CertificationStatusProvider();
      final expected = List<CertificationCapability>.from(CertificationCapability.values);
      final actual = provider.status.capabilities;
      expect(actual.length, equals(expected.length), reason: 'no extra, none missing');
      for (var i = 0; i < expected.length; i++) {
        expect(actual[i], equals(expected[i]), reason: 'order and identity at index $i');
      }
    });
  });

  group('5.4 Forbidden runtime usage', () {
    test('provider file does not use DateTime, Random, Stopwatch, Timer', () {
      final file = File('lib/ui/certification_status/certification_status_provider.dart');
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), isFalse);
      expect(content.contains('Random'), isFalse);
      expect(content.contains('Stopwatch'), isFalse);
      expect(content.contains('Timer'), isFalse);
    });
  });

  group('5.5 Forbidden terms guard', () {
    test('strings in provider status contain no forbidden terms', () {
      final provider = CertificationStatusProvider();
      final status = provider.status;
      final strings = <String>[
        status.version,
        status.generatedBy,
        if (status.description != null) status.description!,
        ...status.capabilities.map((c) => c.code),
      ];
      for (final s in strings) {
        final lower = s.toLowerCase();
        for (final term in _forbiddenTerms) {
          expect(lower.contains(term), isFalse, reason: 'must not contain "$term": $s');
        }
      }
    });
  });
}
