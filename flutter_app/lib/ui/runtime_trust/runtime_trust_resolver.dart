// Phase 11.8.2 — Pure resolver. No side-effects; no fallbacks; deterministic.

import 'package:iris_flutter_app/ui/certification_gate/certification_gate_state.dart';
import 'package:iris_flutter_app/ui/compliance_pack/compliance_pack.dart';
import 'package:iris_flutter_app/ui/time_model/time_context.dart';

import 'runtime_trust_state.dart';

/// Builds RuntimeTrustState from gate, pack and time context. No I/O; no mutation.
class RuntimeTrustResolver {
  RuntimeTrustResolver();

  /// Resolves state. When gate is not open, pack-derived fields are empty/zero.
  RuntimeTrustState resolve({
    required CertificationGateState gateState,
    required CompliancePack pack,
    required TimeContext timeContext,
  }) {
    final isUnlocked = gateState == CertificationGateState.open;
    if (isUnlocked) {
      return RuntimeTrustState(
        isCertified: true,
        compliancePackHash: pack.packHash,
        forensicBundleHash: pack.generatedFromBundleHash,
        logicalTick: timeContext.currentTime.tick,
        sessionId: timeContext.sessionId.value,
      );
    }
    return RuntimeTrustState(
      isCertified: false,
      compliancePackHash: '',
      forensicBundleHash: '',
      logicalTick: 0,
      sessionId: '',
    );
  }
}
