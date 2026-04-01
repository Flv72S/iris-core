// J3 — DeterministicHashEngine. Pure interface; no implementation.

/// Pure contract for deterministic hashing.
/// No clock, no random, no framework dependency.
abstract interface class DeterministicHashEngine {
  /// Returns deterministic hex hash (lowercase) of [input]. Values may be null.
  String hash(Map<String, Object?> input);

  /// Returns deterministic hex hash (lowercase) of [input] list. Elements may be null.
  String hashList(List<Object?> input);

  /// Returns deterministic hex hash (lowercase) of [input] string.
  String hashString(String input);

  /// Returns canonical string for [value] (same form used for hashing). For J4 persistence.
  String toCanonicalString(Object? value);
}
