// J6 — Port for deterministic re-execution (no Core dependency).

import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';

/// Port for executing from a persisted snapshot and returning a persisted result.
/// Implementations may wrap Core orchestrators; replay package does not depend on Core.
abstract interface class ExecutionOrchestratorPort {
  /// Re-executes using [snapshot] and returns a result in persisted form.
  /// Deterministic; no side effects on persistence.
  Future<PersistedExecutionResult> execute(PersistedGovernanceSnapshot snapshot);
}
