// OX9 — Health report. No system clock; deterministic for same state.

class HealthReport {
  const HealthReport({
    required this.ledgerConsistent,
    required this.projectionRebuildOk,
    required this.identityStateConsistent,
    required this.signatureValidationOk,
    required this.forkResolutionOk,
    required this.pendingOptimisticCount,
    required this.aiSuggestionQueueIntegrityOk,
    this.details = const [],
  });

  final bool ledgerConsistent;
  final bool projectionRebuildOk;
  final bool identityStateConsistent;
  final bool signatureValidationOk;
  final bool forkResolutionOk;
  final int pendingOptimisticCount;
  final bool aiSuggestionQueueIntegrityOk;
  final List<String> details;

  bool get isHealthy =>
      ledgerConsistent &&
      projectionRebuildOk &&
      identityStateConsistent &&
      signatureValidationOk &&
      forkResolutionOk &&
      aiSuggestionQueueIntegrityOk;
}

abstract class HealthCheckProvider {
  bool get ledgerConsistent;
  bool get projectionRebuildOk;
  bool get identityStateConsistent;
  bool get signatureValidationOk;
  bool get forkResolutionOk;
  int get pendingOptimisticCount;
  bool get aiSuggestionQueueIntegrityOk;
}

class DeterministicHealthCheck {
  DeterministicHealthCheck({required HealthCheckProvider provider})
      : _provider = provider;
  final HealthCheckProvider _provider;

  HealthReport getSystemHealth() {
    return HealthReport(
      ledgerConsistent: _provider.ledgerConsistent,
      projectionRebuildOk: _provider.projectionRebuildOk,
      identityStateConsistent: _provider.identityStateConsistent,
      signatureValidationOk: _provider.signatureValidationOk,
      forkResolutionOk: _provider.forkResolutionOk,
      pendingOptimisticCount: _provider.pendingOptimisticCount,
      aiSuggestionQueueIntegrityOk: _provider.aiSuggestionQueueIntegrityOk,
    );
  }
}
