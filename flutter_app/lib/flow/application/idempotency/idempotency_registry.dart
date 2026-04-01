// L7 — In-memory registry of executed contract hashes. No persistence, no TTL.

/// In-memory registry of deterministic hashes. Used to enforce idempotency.
class IdempotencyRegistry {
  IdempotencyRegistry() : _hashes = <int>{};

  final Set<int> _hashes;

  /// Returns true if [deterministicHash] was previously registered.
  bool contains(int deterministicHash) => _hashes.contains(deterministicHash);

  /// Registers [deterministicHash] as executed.
  void register(int deterministicHash) {
    _hashes.add(deterministicHash);
  }

  /// Clears all registered hashes. For testing only.
  void clear() {
    _hashes.clear();
  }
}
