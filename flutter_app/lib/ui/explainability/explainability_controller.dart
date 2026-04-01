// Phase 11.5.2 — Read-only controller. Load, step forward/back, jump. No writes, no branching.

import 'package:flutter/foundation.dart';

import 'package:iris_flutter_app/ui/persistence/persistence_record.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_rehydrator.dart';
import 'package:iris_flutter_app/ui/persistence/persistence_store.dart';

import 'explainability_state.dart';

/// Read-only explainability controller. Exposes load, stepForward, stepBackward, jumpTo. No mutations of store or records.
class ExplainabilityController extends ChangeNotifier {
  ExplainabilityController({
    required PersistenceStore store,
    PersistenceRehydrator? rehydrator,
  })  : _store = store,
        _rehydrator = rehydrator ?? PersistenceRehydrator(store: store);

  final PersistenceStore _store;
  final PersistenceRehydrator _rehydrator;

  ExplainabilityState? _state;

  ExplainabilityState? get current => _state;

  /// Loads records from store and sets state at index 0.
  Future<void> load() async {
    final records = await _store.loadAll();
    _state = _computeStateAt(records, 0);
    notifyListeners();
  }

  void stepForward() {
    final records = _state?.records ?? [];
    if (records.isEmpty) return;
    final idx = _state!.currentIndex;
    if (idx >= records.length - 1) return;
    _state = _computeStateAt(records, idx + 1);
    notifyListeners();
  }

  void stepBackward() {
    final records = _state?.records ?? [];
    if (records.isEmpty) return;
    final idx = _state!.currentIndex;
    if (idx <= 0) return;
    _state = _computeStateAt(records, idx - 1);
    notifyListeners();
  }

  void jumpTo(int index) {
    final records = _state?.records ?? [];
    if (records.isEmpty) return;
    final clamped = index.clamp(0, records.length - 1);
    _state = _computeStateAt(records, clamped);
    notifyListeners();
  }

  ExplainabilityState _computeStateAt(List<PersistenceRecord> records, int index) {
    final end = (index + 1).clamp(0, records.length);
    final sublist = records.sublist(0, end);
    final result = _rehydrator.rehydrateFromRecords(sublist);
    return ExplainabilityState(
      records: records,
      currentIndex: index,
      timeContext: result.timeContext,
      store: result.store,
    );
  }
}
