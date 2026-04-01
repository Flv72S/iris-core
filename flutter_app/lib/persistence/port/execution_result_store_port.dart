// J1 — ExecutionResultStorePort. Pure contract; no implementation.

import 'package:iris_flutter_app/persistence/persisted_types.dart';

/// Port for persisting and retrieving execution result records.
/// No infrastructure dependency; no logic.
abstract interface class ExecutionResultStorePort {
  /// Persists an execution result record.
  Future<void> saveResult(PersistedExecutionResult result);

  /// Returns the result for the given [executionId], or null if absent.
  Future<PersistedExecutionResult?> getResult(String executionId);

  /// Removes the result for [executionId].
  Future<void> delete(String executionId);
}
