// Phase 11.8.1 — Read-only wrapper. No mutable state; no listeners.

import 'certification_gate_result.dart';
import 'certification_gate_state.dart';

/// Read-only container for certification gate result. Pure value holder.
class CertificationGateController {
  const CertificationGateController(this.result);

  final CertificationGateResult result;

  /// True only when gate state is open.
  bool get isOpen => result.state == CertificationGateState.open;
}
