// M3 — Sequential composition engine. Deterministic ordered flow; no L modification.

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';

/// Composes a list of [DeterministicExecutionContract] in strict order into a [CompositeDeterministicContract].
/// No reordering, no deduplication, no filtering; order-sensitive and deterministic.
class SequentialFlowComposer {
  SequentialFlowComposer();

  /// Builds a CDC from [contracts] preserving exact order. List must not be empty; input is not modified.
  CompositeDeterministicContract compose(List<DeterministicExecutionContract> contracts) {
    if (contracts.isEmpty) {
      throw ArgumentError('contracts must not be empty');
    }
    return CompositeDeterministicContract(contracts);
  }
}
