// Phase 13.9 — Phase 13 closure guard. Gate before Phase 14.

import 'external_audit_bundle.dart';
import 'formal_core_snapshot.dart';
import 'snapshot_verifier.dart';

/// Throws if the snapshot is invalid. Call with a snapshot that has been verified
/// against the canonical audit bundle; if valid, Phase 13 is considered closed.
void assertPhase13Closed(
  FormalCoreCertificationSnapshot snapshot,
  ExternalAuditBundle bundle,
) {
  if (!verifyFormalCoreCertificationSnapshot(snapshot, bundle)) {
    throw Phase13ClosureError('Formal core certification snapshot invalid; Phase 13 not closed.');
  }
}

/// Thrown when the certification snapshot does not validate.
class Phase13ClosureError extends Error {
  Phase13ClosureError(this.message);
  final String message;
  @override
  String toString() => 'Phase13ClosureError: $message';
}
