// F0 — Flow boundary contract integrity tests.

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_boundary/flow_core_contract.dart';

void main() {
  group('Contract integrity', () {
    test('StructuralHashSnapshot has only final field', () {
      const s = StructuralHashSnapshot(value: 'abc');
      expect(s.value, equals('abc'));
    });

    test('TrustStateSnapshot has only final fields', () {
      const t = TrustStateSnapshot(
        structuralHash: 'a',
        freezeSealHash: 'b',
        hasValidChain: true,
      );
      expect(t.structuralHash, equals('a'));
      expect(t.freezeSealHash, equals('b'));
      expect(t.hasValidChain, isTrue);
    });

    test('CertificationContextSnapshot has only final fields', () {
      const c = CertificationContextSnapshot(
        manifestVersion: '14.3',
        evidenceEntryIds: ['id1'],
        packageHash: 'h',
      );
      expect(c.manifestVersion, equals('14.3'));
      expect(c.evidenceEntryIds, orderedEquals(['id1']));
      expect(c.packageHash, equals('h'));
    });

    test('flow_core_contract.dart contains no mutative API patterns', () {
      final path = 'lib/flow_boundary/flow_core_contract.dart';
      final content = File(path).readAsStringSync();
      const mutativePatterns = [
        'void write',
        'void update',
        'void invalidate',
        'void recalc',
        'void rebuild',
        'void set ',
        'void mutate',
        'void modify',
        'Future<void> write',
        'Future<void> update',
      ];
      for (final pattern in mutativePatterns) {
        expect(
          content.contains(pattern),
          isFalse,
          reason: 'Contract must not define mutative API: $pattern',
        );
      }
    });

    test('flow_core_contract exposes only read-style members', () {
      final path = 'lib/flow_boundary/flow_core_contract.dart';
      final content = File(path).readAsStringSync();
      expect(content.contains('readStructuralHash'), isTrue);
      expect(content.contains('readTrustState'), isTrue);
      expect(content.contains('readCertificationContext'), isTrue);
      expect(content.contains('get '), isTrue);
    });
  });
}
