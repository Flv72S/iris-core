// F1 — Core snapshot reader tests. Determinism and isolation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_core_consumption/core_consumption_models.dart';
import 'package:iris_flutter_app/flow_core_consumption/core_snapshot_reader.dart';
import 'package:iris_flutter_app/flow_core_consumption/default_flow_core_contract.dart';

void main() {
  late CoreSnapshotReader reader;

  setUpAll(() {
    final contract = DefaultFlowCoreContract();
    reader = CoreSnapshotReader(contract);
  });

  group('Snapshot deterministic', () {
    test('same Core yields same Flow snapshot', () {
      final a = reader.readSnapshot();
      final b = reader.readSnapshot();
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('structural hash and manifest version present and stable', () {
      final s = reader.readSnapshot();
      expect(s.structuralHash.length, equals(64));
      expect(s.manifestVersion, isNotEmpty);
      expect(RegExp(r'^[a-f0-9]{64}$').hasMatch(s.structuralHash), isTrue);
    });

    test('order and content preserved', () {
      final s1 = reader.readSnapshot();
      final s2 = reader.readSnapshot();
      expect(s1.structuralHash, equals(s2.structuralHash));
      expect(s1.manifestVersion, equals(s2.manifestVersion));
    });
  });
}
