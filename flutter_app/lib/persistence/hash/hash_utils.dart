// J3 — HashUtils. Static helpers; uses J2 toMap() only.

import 'package:iris_flutter_app/persistence/model/persisted_execution_result.dart';
import 'package:iris_flutter_app/persistence/model/persisted_failure_event.dart';
import 'package:iris_flutter_app/persistence/model/persisted_governance_snapshot.dart';
import 'package:iris_flutter_app/persistence/model/persisted_guard_report.dart';
import 'package:iris_flutter_app/persistence/model/persisted_observability_event.dart';

import 'deterministic_hash_engine.dart';

/// Static hash utilities for J2 persisted models. No side effects; no timestamp.
class HashUtils {
  HashUtils._();

  static String hashSnapshot(
    PersistedGovernanceSnapshot snapshot,
    DeterministicHashEngine engine,
  ) {
    return engine.hash(Map<String, Object?>.from(snapshot.toMap()));
  }

  static String hashResult(
    PersistedExecutionResult result,
    DeterministicHashEngine engine,
  ) {
    return engine.hash(Map<String, Object?>.from(result.toMap()));
  }

  static String hashEvent(
    PersistedObservabilityEvent event,
    DeterministicHashEngine engine,
  ) {
    return engine.hash(Map<String, Object?>.from(event.toMap()));
  }

  static String hashFailure(
    PersistedFailureEvent event,
    DeterministicHashEngine engine,
  ) {
    return engine.hash(Map<String, Object?>.from(event.toMap()));
  }

  static String hashGuard(
    PersistedGuardReport report,
    DeterministicHashEngine engine,
  ) {
    return engine.hash(Map<String, Object?>.from(report.toMap()));
  }
}
