// KX — Operation context. Passed from outside; no internal generation.

/// Context for an infrastructure operation. operationId and resourceId are supplied by the caller.
class InfrastructureOperationContext {
  const InfrastructureOperationContext({
    required this.operationId,
    required this.resourceId,
  });

  final String operationId;
  final String resourceId;
}
