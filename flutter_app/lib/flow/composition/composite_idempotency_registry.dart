// M8 — Idempotency registry for ComposableDeterministicUnit. Same semantics as L7; operates on hash only.

import 'package:iris_flutter_app/flow/composition/composable_deterministic_unit.dart';

/// Registry of deterministic hashes for composite/nested units. Decisions based only on [deterministicHash]; no collision resolution.
/// Per-instance; does not replace L7 IdempotencyRegistry.
class CompositeIdempotencyRegistry {
  CompositeIdempotencyRegistry() : _hashes = <int>{};

  final Set<int> _hashes;

  /// True if [unit]'s hash was previously registered.
  bool isDuplicate(ComposableDeterministicUnit unit) =>
      _hashes.contains(unit.deterministicHash);

  /// Registers [unit]'s hash. Does not compare canonicalBytes.
  void register(ComposableDeterministicUnit unit) {
    _hashes.add(unit.deterministicHash);
  }

  /// Registers [unit]'s hash if not already present. Returns true if added, false if duplicate.
  bool registerIfAbsent(ComposableDeterministicUnit unit) {
    final h = unit.deterministicHash;
    if (_hashes.contains(h)) return false;
    _hashes.add(h);
    return true;
  }

  /// Clears all registered hashes.
  void clear() {
    _hashes.clear();
  }

  /// Number of distinct hashes registered.
  int get size => _hashes.length;
}
