// F1 — Certification context reader tests. Integrity; no mutation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_core_consumption/certification_context_reader.dart';
import 'package:iris_flutter_app/flow_core_consumption/core_consumption_models.dart';
import 'package:iris_flutter_app/flow_core_consumption/default_flow_core_contract.dart';

void main() {
  late CertificationContextReader reader;

  setUpAll(() {
    final contract = DefaultFlowCoreContract();
    reader = CertificationContextReader(contract);
  });

  group('Certification context integrity', () {
    test('data coherent with Core', () {
      final ctx = reader.readCertificationContext();
      expect(ctx.manifestVersion, isNotEmpty);
      expect(ctx.structuralHash.length, equals(64));
      expect(ctx.packageHash.length, equals(64));
      expect(ctx.evidenceEntryIds.length, greaterThanOrEqualTo(10));
    });

    test('evidence entry ids stable order', () {
      final a = reader.readCertificationContext();
      final b = reader.readCertificationContext();
      expect(a.evidenceEntryIds, orderedEquals(b.evidenceEntryIds));
    });

    test('no mutation: two reads equal', () {
      final a = reader.readCertificationContext();
      final b = reader.readCertificationContext();
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('toJson roundtrip-safe structure', () {
      final ctx = reader.readCertificationContext();
      final json = ctx.toJson();
      expect(json['manifestVersion'], equals(ctx.manifestVersion));
      expect(json['structuralHash'], equals(ctx.structuralHash));
      expect(json['packageHash'], equals(ctx.packageHash));
      expect(json['evidenceEntryIds'], orderedEquals(ctx.evidenceEntryIds));
    });
  });
}
