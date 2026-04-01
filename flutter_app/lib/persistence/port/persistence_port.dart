// J1 — PersistencePort. Root contract; aggregation only.

import 'package:iris_flutter_app/persistence/port/event_store_port.dart';
import 'package:iris_flutter_app/persistence/port/execution_result_store_port.dart';
import 'package:iris_flutter_app/persistence/port/guard_report_store_port.dart';
import 'package:iris_flutter_app/persistence/port/snapshot_store_port.dart';

/// Optional root port for unified access to persistence stores.
/// No logic; no infrastructure dependency.
abstract interface class PersistencePort {
  /// Returns the snapshot store.
  SnapshotStorePort snapshotStore();

  /// Returns the event store.
  EventStorePort eventStore();

  /// Returns the execution result store.
  ExecutionResultStorePort executionStore();

  /// Returns the guard report store.
  GuardReportStorePort guardReportStore();
}
