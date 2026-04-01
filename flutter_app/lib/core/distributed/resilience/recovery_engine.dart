// ODA-9 — Forward-only deterministic recovery. No rollback.

import 'package:iris_flutter_app/core/distributed/resilience/adversarial_scenario_registry.dart';

class RecoveryStep {
  const RecoveryStep({
    required this.stepId,
    required this.incidentId,
    required this.actionRef,
    required this.signature,
  });
  final String stepId;
  final String incidentId;
  final String actionRef;
  final String signature;
}

class RecoveryEngine {
  RecoveryEngine._();

  static IncidentEvent initiateRecovery(String incidentId, int eventIndex, String signature) {
    return IncidentEvent(
      eventType: IncidentEventType.recoveryInitiated,
      incidentId: incidentId,
      eventIndex: eventIndex,
      payload: {},
      signature: signature,
    );
  }

  static RecoveryStep executeRecoveryStep({
    required String stepId,
    required String incidentId,
    required String actionRef,
    required String signature,
  }) {
    return RecoveryStep(
      stepId: stepId,
      incidentId: incidentId,
      actionRef: actionRef,
      signature: signature,
    );
  }

  static IncidentEvent finalizeRecovery(String incidentId, int eventIndex, String signature) {
    return IncidentEvent(
      eventType: IncidentEventType.recoveryCompleted,
      incidentId: incidentId,
      eventIndex: eventIndex,
      payload: {},
      signature: signature,
    );
  }
}
