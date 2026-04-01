// ODA-9 — Deterministic containment. Event-driven; no ledger history mutation.

import 'package:iris_flutter_app/core/distributed/resilience/adversarial_scenario_registry.dart';

enum ContainmentActionType {
  suspendNode,
  suspendDomain,
  suspendFederation,
  freezeEconomicActor,
  blockCrossClusterEvents,
}

class ContainmentAction {
  const ContainmentAction({
    required this.incidentId,
    required this.actionType,
    required this.entityId,
    required this.signature,
  });
  final String incidentId;
  final ContainmentActionType actionType;
  final String entityId;
  final String signature;
}

class ContainmentEngine {
  ContainmentEngine._();

  static ContainmentAction executeContainment({
    required String incidentId,
    required ContainmentActionType actionType,
    required String entityId,
    required String signature,
  }) {
    return ContainmentAction(
      incidentId: incidentId,
      actionType: actionType,
      entityId: entityId,
      signature: signature,
    );
  }

  static bool verifyContainmentAction(
    ContainmentAction action,
    bool Function(String incidentId, String entityId, String signature) verify,
  ) {
    return verify(action.incidentId, action.entityId, action.signature);
  }
}
