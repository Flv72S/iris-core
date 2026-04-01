/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

abstract class DeterministicEvent {
  int get deterministicHash;
  int get eventIndex;
  String get source;
}
