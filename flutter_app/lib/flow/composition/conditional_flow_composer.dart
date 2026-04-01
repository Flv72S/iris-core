// M5 — Conditional structural composition. Deterministic inclusion via predicate; order-invariant.

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';

/// Composes DECs that satisfy a deterministic predicate into a CDC. Order-invariant among included DECs (same as M4).
/// Does not modify the input list or any DEC.
class ConditionalFlowComposer {
  ConditionalFlowComposer() : _parallel = ParallelFlowComposer();

  final ParallelFlowComposer _parallel;

  /// Builds a CDC from DECs in [contracts] for which [predicate] returns true. Sorted by hash then bytes (M4 order).
  /// Throws [ArgumentError] if no DEC satisfies the predicate. Input list is not modified.
  CompositeDeterministicContract compose(
    List<DeterministicExecutionContract> contracts,
    bool Function(DeterministicExecutionContract) predicate,
  ) {
    final included = contracts.where(predicate).toList();
    if (included.isEmpty) {
      throw ArgumentError('at least one contract must satisfy the predicate');
    }
    return _parallel.compose(included);
  }
}
