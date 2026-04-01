// J1 — GuardReportStorePort. Pure contract; no implementation.

import 'package:iris_flutter_app/persistence/persisted_types.dart';

/// Port for persisting and retrieving guard report records.
/// No infrastructure dependency; no logic.
abstract interface class GuardReportStorePort {
  /// Persists a guard report record.
  Future<void> saveReport(PersistedGuardReport report);

  /// Returns the report for the given [executionId], or null if absent.
  Future<PersistedGuardReport?> getReport(String executionId);

  /// Removes the report for [executionId].
  Future<void> delete(String executionId);
}
