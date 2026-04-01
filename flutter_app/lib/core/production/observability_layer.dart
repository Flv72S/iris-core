// OX9 — Deterministic metrics. No state alteration; no clock; derived from projection/logs.

class DeterministicMetrics {
  const DeterministicMetrics({
    required this.ledgerHeight,
    required this.forkCount,
    required this.projectionRebuildCount,
    required this.signatureFailureCount,
    required this.aiSuggestionCount,
    required this.permissionDenialCount,
  });

  final int ledgerHeight;
  final int forkCount;
  final int projectionRebuildCount;
  final int signatureFailureCount;
  final int aiSuggestionCount;
  final int permissionDenialCount;
}

abstract class ObservabilityProvider {
  int get ledgerHeight;
  int get forkCount;
  int get projectionRebuildCount;
  int get signatureFailureCount;
  int get aiSuggestionCount;
  int get permissionDenialCount;
}

class ObservabilityLayer {
  ObservabilityLayer({required ObservabilityProvider provider})
      : _provider = provider;
  final ObservabilityProvider _provider;

  DeterministicMetrics getMetrics() {
    return DeterministicMetrics(
      ledgerHeight: _provider.ledgerHeight,
      forkCount: _provider.forkCount,
      projectionRebuildCount: _provider.projectionRebuildCount,
      signatureFailureCount: _provider.signatureFailureCount,
      aiSuggestionCount: _provider.aiSuggestionCount,
      permissionDenialCount: _provider.permissionDenialCount,
    );
  }
}
