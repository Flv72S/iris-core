// Phase 11.5.2 — Immutable state for offline explainability viewer. Read-only.

import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/time_model/time_context.dart';
import 'package:iris_flutter_app/ui/trace_navigation/trace_navigation_controller.dart';

/// Immutable snapshot at a given replay index. Each step produces a new instance. Each step produces a new instance.
class ExplainabilityState {
  const ExplainabilityState({
    required this.records,
    required this.currentIndex,
    required this.timeContext,
    required this.store,
  });

  final List<PersistenceRecord> records;
  final int currentIndex;
  final TimeContext timeContext;
  final ReplayTraceStore store;

  int get totalSteps => records.length;

  PersistenceRecord? get currentRecord =>
      currentIndex >= 0 && currentIndex < records.length ? records[currentIndex] : null;

  List<String> get navigationStack {
    final nav = TraceNavigationController(store);
    return nav.computeRouteStack();
  }
}
