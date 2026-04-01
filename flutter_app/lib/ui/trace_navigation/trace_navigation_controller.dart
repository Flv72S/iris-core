// Phase 11.3.3 — Deterministic route stack from store. Read-only.

import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'trace_route_mapper.dart';

/// Computes route stack and top from ReplayTraceStore. No side-effects.
class TraceNavigationController {
  TraceNavigationController(this._store);

  final ReplayTraceStore _store;

  /// Route names in store order. Deterministic.
  List<String> computeRouteStack() {
    final traces = _store.getAll();
    return traces.map(mapTraceToRoute).toList();
  }

  /// Top route or null if empty.
  String? computeTopRoute() {
    final stack = computeRouteStack();
    return stack.isEmpty ? null : stack.last;
  }

  /// True if stack has more than one entry.
  bool canPop() {
    return computeRouteStack().length > 1;
  }
}
