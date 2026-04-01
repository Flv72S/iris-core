// F0 — Formal boundary rules. Declarative only; no runtime logic.

/// Classification of operations at the Core/Flow boundary.
enum FlowBoundaryOperationKind {
  allowed,
  forbidden,
  neverAllowed,
}

/// Allowed operations: read-only, no side effects.
const List<String> flowBoundaryAllowedOperations = [
  'readStructuralHash',
  'readTrustState',
  'readCertificationContext',
  'read snapshot',
  'read trust state',
  'read certification context',
  'read structural hash',
];

/// Forbidden operations: mutative or side-effectful.
const List<String> flowBoundaryForbiddenOperations = [
  'write',
  'update',
  'invalidate',
  'recalc',
  'rebuild',
  'override',
  'set',
  'mutate',
  'modify',
  'delete',
  'clear',
];

/// Never allowed under any circumstance.
const List<String> flowBoundaryNeverAllowedOperations = [
  'import core_freeze',
  'import certification internal',
  'call Core setter',
  'invoke Core write API',
  'mutate Core state',
  'depend Core to Flow',
];
