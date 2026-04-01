// Microstep 12.4 — Certification Status ViewModel: UI-safe projection tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_capability.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status.dart';
import 'package:iris_flutter_app/ui/certification_status/certification_status_view_model.dart';

const _forbiddenTerms = [
  'compliant',
  'certified',
  'approved',
  'regulation',
  'legal',
  'meets',
];

void main() {
  late CertificationStatus status;

  setUp(() {
    status = CertificationStatus.defaultStatus;
  });

  group('4.1 Deterministic projection', () {
    test('same CertificationStatus yields equal ViewModel and same hashCode', () {
      final a = CertificationStatusViewModel.fromStatus(status);
      final b = CertificationStatusViewModel.fromStatus(status);
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });

  group('4.2 Order stability', () {
    test('capability order in ViewModel matches status.capabilities', () {
      final vm = CertificationStatusViewModel.fromStatus(status);
      expect(vm.capabilities.length, equals(status.capabilities.length));
      for (var i = 0; i < status.capabilities.length; i++) {
        expect(vm.capabilities[i].code, equals(status.capabilities[i].code));
      }
    });
  });

  group('4.3 Pure projection', () {
    test('no capability added or removed, code identical to enum', () {
      final vm = CertificationStatusViewModel.fromStatus(status);
      expect(vm.capabilities.length, equals(status.capabilities.length));
      final enumCodes = CertificationCapability.values.map((e) => e.code).toSet();
      for (final cap in vm.capabilities) {
        expect(enumCodes.contains(cap.code), isTrue);
        expect(cap.code, equals(CertificationCapability.fromCode(cap.code).code));
      }
    });
  });

  group('4.4 Forbidden terms guard', () {
    test('no string in ViewModel contains forbidden terms', () {
      final vm = CertificationStatusViewModel.fromStatus(status);
      final strings = <String>[
        vm.title,
        vm.subtitle,
        ...vm.capabilities.map((c) => c.code),
        ...vm.capabilities.map((c) => c.label),
        ...vm.capabilities.map((c) => c.description),
      ];
      for (final s in strings) {
        final lower = s.toLowerCase();
        for (final term in _forbiddenTerms) {
          expect(lower.contains(term), isFalse, reason: 'must not contain "$term": $s');
        }
      }
    });
  });

  group('4.5 No runtime logic', () {
    test('view model file does not use DateTime, Random, Stopwatch, Timer', () {
      final file = File('lib/ui/certification_status/certification_status_view_model.dart');
      final content = file.readAsStringSync();
      expect(content.contains('DateTime'), isFalse);
      expect(content.contains('Random'), isFalse);
      expect(content.contains('Stopwatch'), isFalse);
      expect(content.contains('Timer'), isFalse);
    });

    test('view model file has no if/else branching on capability', () {
      final file = File('lib/ui/certification_status/certification_status_view_model.dart');
      final content = file.readAsStringSync();
      expect(content.contains('if (c =='), isFalse, reason: 'no if (c == ...)');
      expect(content.contains('if (capability =='), isFalse, reason: 'no if (capability == ...)');
      expect(content.contains('if (status.capabilities'), isFalse, reason: 'no if on status.capabilities');
    });
  });
}
