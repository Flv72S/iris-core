// Phase 11.4.1 — Deterministic trigger for navigation rebuild. No semantic payload.

import 'package:flutter/foundation.dart';

/// Notifier incremented only after a valid trace save. Used to trigger navigation host rebuild.
class DecisionLoopNotifier extends ValueNotifier<int> {
  DecisionLoopNotifier() : super(0);

  /// Call only after a validated trace has been saved. No other semantics.
  void notifyAfterSave() {
    value = value + 1;
  }
}
