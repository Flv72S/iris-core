// ODA-2 — Event index range to transfer. No skip, reorder, or modify.

class DeltaRange {
  const DeltaRange({required this.startIndex, required this.endIndex});
  final int startIndex;
  final int endIndex;
  int get count => endIndex >= startIndex ? endIndex - startIndex + 1 : 0;
}

class DeterministicDeltaCalculator {
  DeterministicDeltaCalculator._();

  static DeltaRange calculateOutgoingDelta(int localHeight, int peerHeight, int divergenceIndex) {
    if (divergenceIndex < 0) return const DeltaRange(startIndex: 0, endIndex: -1);
    final start = divergenceIndex;
    final end = peerHeight < localHeight ? localHeight - 1 : localHeight - 1;
    return DeltaRange(startIndex: start, endIndex: end > start ? end : start - 1);
  }

  static DeltaRange calculateIncomingDelta(int localHeight, int peerHeight, int divergenceIndex) {
    if (divergenceIndex < 0) return const DeltaRange(startIndex: 0, endIndex: -1);
    final start = divergenceIndex;
    final end = peerHeight > localHeight ? peerHeight - 1 : peerHeight - 1;
    return DeltaRange(startIndex: start, endIndex: end >= start ? end : start - 1);
  }
}
