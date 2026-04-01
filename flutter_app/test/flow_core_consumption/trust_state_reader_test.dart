// F1 — Trust state reader tests. Neutrality; no inference.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_core_consumption/default_flow_core_contract.dart';
import 'package:iris_flutter_app/flow_core_consumption/trust_state_reader.dart';

void main() {
  late TrustStateReader reader;

  setUpAll(() {
    final contract = DefaultFlowCoreContract();
    reader = TrustStateReader(contract);
  });

  group('Trust reader neutrality', () {
    test('exposes only presence of signals', () {
      final state = reader.readTrustState();
      expect(state.snapshotHashPresent, isTrue);
      expect(state.traceabilityPresent, isTrue);
      expect(state.availableTrustSignals, isNotEmpty);
    });

    test('no validity or certified-style field', () {
      final state = reader.readTrustState();
      expect(state.availableTrustSignals, isNot(contains('isValid')));
      expect(state.availableTrustSignals, isNot(contains('isTrusted')));
      expect(state.availableTrustSignals, isNot(contains('isCertified')));
    });

    test('deterministic: two reads equal', () {
      final a = reader.readTrustState();
      final b = reader.readTrustState();
      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });
  });
}
