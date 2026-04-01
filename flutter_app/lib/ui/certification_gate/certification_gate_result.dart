// Phase 11.8.1 — Immutable gate result DTO. No logic.

import 'certification_gate_state.dart';

/// Result of certification gate verification. Immutable; equality deterministic.
class CertificationGateResult {
  const CertificationGateResult({
    required this.state,
    this.bundleHash,
    this.packHash,
    this.reason,
  });

  final CertificationGateState state;
  final String? bundleHash;
  final String? packHash;
  final String? reason;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CertificationGateResult &&
          runtimeType == other.runtimeType &&
          state == other.state &&
          bundleHash == other.bundleHash &&
          packHash == other.packHash &&
          reason == other.reason;

  @override
  int get hashCode => Object.hash(state, bundleHash, packHash, reason);
}
