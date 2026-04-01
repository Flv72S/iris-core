// F0 — Registry of forbidden operations and imports for boundary enforcement tests.

/// Method names that must not be invoked by Flow on Core surface.
const List<String> forbiddenCoreMethodNames = [
  'write',
  'set',
  'update',
  'invalidate',
  'recalc',
  'rebuild',
  'override',
  'mutate',
  'modify',
  'delete',
  'clear',
  'add',
  'remove',
  'append',
  'reset',
];

/// Forbidden patterns in Flow code (substring match).
const List<String> forbiddenCorePatterns = [
  'core_freeze',
  'CoreFreeze',
  'core_freeze/',
  'package:iris_flutter_app/core_freeze',
  'package:iris_flutter_app/certification/evidence',
  'package:iris_flutter_app/certification/public/public_verification_package_builder',
  'package:iris_flutter_app/certification/seal/public_certification_seal_generator',
  'package:iris_flutter_app/certification/transparency/public_trust_disclosure_generator',
  'package:iris_flutter_app/certification/reproducibility/external_audit_proof_generator',
];

/// Core library paths that Flow must not import directly.
const List<String> forbiddenCoreImportPaths = [
  'package:iris_flutter_app/core_freeze/',
  'lib/core_freeze/',
];

/// Core package URI prefixes that Flow must not use (except via contract adapter).
const List<String> forbiddenCorePackageUris = [
  'package:iris_flutter_app/core_freeze',
];
