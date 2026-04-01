/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

class DeterministicHash {
  DeterministicHash._();

  static const int _offsetBasis = 0x811c9dc5;
  static const int _prime = 0x01000193;

  static int computeDeterministicHash(List<int> bytes) {
    int h = _offsetBasis;
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i] & 0xff;
      h = (h * _prime) & 0xffffffff;
    }
    return h;
  }
}
