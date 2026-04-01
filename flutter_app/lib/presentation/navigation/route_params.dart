// Phase 11.1.3 — Immutable nav params. Serializable. No logic.

class DecisionDetailParams {
  const DecisionDetailParams({required this.traceId});
  final String traceId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DecisionDetailParams && traceId == other.traceId;

  @override
  int get hashCode => traceId.hashCode;
}

class ExplainabilityParams {
  const ExplainabilityParams({
    required this.explanationId,
    required this.traceId,
  });
  final String explanationId;
  final String traceId;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ExplainabilityParams &&
          explanationId == other.explanationId &&
          traceId == other.traceId;

  @override
  int get hashCode => Object.hash(explanationId, traceId);
}
