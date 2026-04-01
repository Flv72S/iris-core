// Phase 11.3.3 / 11.4.1 — Navigator.pages from store. Rebuild on DecisionLoopNotifier only.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/bridge/replay_store/replay_trace_store.dart';
import 'package:iris_flutter_app/ui/decision_loop/decision_loop_notifier.dart';
import 'trace_pages_factory.dart';

/// Root widget that builds Navigator from ReplayTraceStore. Pages only; no imperative push.
/// When [notifier] is provided, listens to it and rebuilds so stack is derived only from store.
class TraceNavigationHost extends StatefulWidget {
  const TraceNavigationHost({
    super.key,
    required this.store,
    this.notifier,
  });

  final ReplayTraceStore store;
  /// When non-null, host rebuilds when this notifier changes (after valid trace save).
  final DecisionLoopNotifier? notifier;

  @override
  State<TraceNavigationHost> createState() => _TraceNavigationHostState();
}

class _TraceNavigationHostState extends State<TraceNavigationHost> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _syncFromStore();
    widget.notifier?.addListener(_onNotifierChanged);
  }

  @override
  void didUpdateWidget(covariant TraceNavigationHost oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.notifier != widget.notifier) {
      oldWidget.notifier?.removeListener(_onNotifierChanged);
      widget.notifier?.addListener(_onNotifierChanged);
    }
    final traces = widget.store.getAll();
    if (_currentIndex >= traces.length && traces.isNotEmpty) {
      _currentIndex = traces.length - 1;
    }
  }

  @override
  void dispose() {
    widget.notifier?.removeListener(_onNotifierChanged);
    super.dispose();
  }

  void _onNotifierChanged() {
    setState(() => _syncFromStore());
  }

  void _syncFromStore() {
    final traces = widget.store.getAll();
    _currentIndex = traces.isEmpty ? 0 : traces.length - 1;
    if (_currentIndex < 0) _currentIndex = 0;
  }

  @override
  Widget build(BuildContext context) {
    final traces = widget.store.getAll();
    if (traces.isEmpty) {
      return const Scaffold(body: Center(child: Text('No traces')));
    }
    final pages = buildPagesFromTraces(traces.sublist(0, _currentIndex + 1));
    return Navigator(
      pages: pages,
      onPopPage: (route, result) {
        if (_currentIndex <= 0) return false;
        setState(() => _currentIndex--);
        return true;
      },
    );
  }
}
