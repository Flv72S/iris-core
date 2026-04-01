// M6 — Conditional + parallel composition. Predicate filter then order-invariant sort (M4). No L/M1–M5 modification.

import 'package:iris_flutter_app/flow/application/contract/deterministic_execution_contract.dart';
import 'package:iris_flutter_app/flow/composition/composite_deterministic_contract.dart';
import 'package:iris_flutter_app/flow/composition/parallel_flow_composer.dart';

/// Applies a deterministic predicate to select DECs, then composes them in order-invariant order (parallel).
/// Semantically: filter + parallel deterministic composition. Does not modify input list or DECs.
class ConditionalParallelFlowComposer {
  ConditionalParallelFlowComposer() : _parallel = ParallelFlowComposer();

  final ParallelFlowComposer _parallel;

  /// Step 1: Validate non-empty input and non-empty after filter.
  /// Step 2–3: Defensive copy via where().toList(); apply predicate.
  /// Step 4: Order-invariant sort (deterministicHash asc, canonicalBytes lex).
  /// Step 5: Build CDC from sorted list.
  CompositeDeterministicContract compose(
    List<DeterministicExecutionContract> contracts,
    bool Function(DeterministicExecutionContract) predicate,
  ) {
    if (contracts.isEmpty) {
      throw ArgumentError('contracts must not be empty');
    }
    final included = contracts.where(predicate).toList();
    if (included.isEmpty) {
      throw ArgumentError('at least one contract must satisfy the predicate');
    }
    return _parallel.compose(included);
  }
}
