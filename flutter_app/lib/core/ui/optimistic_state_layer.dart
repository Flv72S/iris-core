/// OX4 — Ephemeral optimistic overlays. Rollback on failure; invalidate on fork.

import 'package:iris_flutter_app/core/ui/ui_intent.dart';

/// Holds pending intents by intentId. Must not alter canonical projection.
class OptimisticStateLayer {
  OptimisticStateLayer();

  final Map<String, UIIntent> _pending = {};

  /// Apply optimistic overlay for [intent]. [intent.intentId] must be set.
  void applyOptimistic(UIIntent intent) {
    final id = intent.intentId ?? _fallbackId(intent);
    _pending[id] = intent;
  }

  /// Remove overlay on ledger reject.
  void rollback(String intentId) {
    _pending.remove(intentId);
  }

  /// Remove overlay on projection rebuild / success.
  void confirm(String intentId) {
    _pending.remove(intentId);
  }

  /// Clear all pending (e.g. on fork).
  void clearAll() {
    _pending.clear();
  }

  /// Pending intents for a projection (for UI overlay).
  List<UIIntent> getOptimisticOverlays(String? projectionId) {
    if (projectionId == null) return List<UIIntent>.from(_pending.values);
    return _pending.values
        .where((i) => i.targetProjectionId == projectionId)
        .toList();
  }

  bool get hasPending => _pending.isNotEmpty;

  static String _fallbackId(UIIntent intent) {
    return '${intent.type}_${identityHashCode(intent)}';
  }
}
