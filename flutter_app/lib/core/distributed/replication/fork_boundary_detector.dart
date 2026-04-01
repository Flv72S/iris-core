// ODA-2 — Detect divergence point. Deterministic.

class ForkBoundaryReport {
  const ForkBoundaryReport({
    required this.divergenceIndex,
    required this.localHashAtDivergence,
    required this.peerHashAtDivergence,
    required this.forkDetected,
  });
  final int divergenceIndex;
  final String localHashAtDivergence;
  final String peerHashAtDivergence;
  final bool forkDetected;
}

abstract class LedgerHashView {
  int get height;
  String get headHash;
  String? getHashAt(int index);
}

class ForkBoundaryDetector {
  ForkBoundaryDetector._();

  static ForkBoundaryReport detectFork(
    LedgerHashView localLedger,
    String peerLedgerHeadHash,
    String Function(int index) peerHashAt,
    int peerHeight,
  ) {
    final localHeight = localLedger.height;
    final minLen = localHeight < peerHeight ? localHeight : peerHeight;
    for (var i = 0; i <= minLen; i++) {
      final localH = localLedger.getHashAt(i);
      final peerH = peerHashAt(i);
      if (localH != peerH) {
        return ForkBoundaryReport(
          divergenceIndex: i,
          localHashAtDivergence: localH ?? '',
          peerHashAtDivergence: peerH,
          forkDetected: true,
        );
      }
    }
    if (localHeight != peerHeight) {
      return ForkBoundaryReport(
        divergenceIndex: minLen + 1,
        localHashAtDivergence: localLedger.getHashAt(minLen) ?? '',
        peerHashAtDivergence: peerLedgerHeadHash,
        forkDetected: true,
      );
    }
    return const ForkBoundaryReport(
      divergenceIndex: -1,
      localHashAtDivergence: '',
      peerHashAtDivergence: '',
      forkDetected: false,
    );
  }
}
