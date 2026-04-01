/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

abstract class DeterministicState {
  int get deterministicHash;
  List<int> get canonicalBytes;
  int get stateVersion;
  Map<String, dynamic> toCanonicalMap();
}
