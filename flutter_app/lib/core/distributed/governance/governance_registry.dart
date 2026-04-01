// ODA-6 — Event-sourced governance state. Append-only; replay-reconstructable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class GovernanceEventType {
  GovernanceEventType._();
  static const String policyProposed = 'POLICY_PROPOSED';
  static const String policyApproved = 'POLICY_APPROVED';
  static const String policyRejected = 'POLICY_REJECTED';
  static const String policyActivated = 'POLICY_ACTIVATED';
  static const String policyDeprecated = 'POLICY_DEPRECATED';
  static const String governanceSuspended = 'GOVERNANCE_SUSPENDED';
  static const String governanceReinstated = 'GOVERNANCE_REINSTATED';
}

class GovernanceEvent {
  const GovernanceEvent({
    required this.eventType,
    required this.policyId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String policyId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class GovernanceRegistry {
  GovernanceRegistry();

  final List<GovernanceEvent> _events = [];

  List<GovernanceEvent> get events => List.unmodifiable(_events);

  void appendGovernanceEvent(GovernanceEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  GovernanceRegistryState rebuildState() {
    final activePolicies = <String>{};
    final pendingProposals = <String>{};
    final approvedNotActive = <String, Set<String>>{};
    final deprecated = <String>{};
    var governanceSuspended = false;
    for (final e in _events) {
      switch (e.eventType) {
        case GovernanceEventType.policyProposed:
          pendingProposals.add(e.policyId);
          break;
        case GovernanceEventType.policyApproved:
          pendingProposals.remove(e.policyId);
          approvedNotActive.putIfAbsent(e.policyId, () => {}).add(e.payload['clusterId'] as String? ?? '');
          break;
        case GovernanceEventType.policyRejected:
          pendingProposals.remove(e.policyId);
          break;
        case GovernanceEventType.policyActivated:
          activePolicies.add(e.policyId);
          approvedNotActive.remove(e.policyId);
          break;
        case GovernanceEventType.policyDeprecated:
          activePolicies.remove(e.policyId);
          deprecated.add(e.policyId);
          break;
        case GovernanceEventType.governanceSuspended:
          governanceSuspended = true;
          break;
        case GovernanceEventType.governanceReinstated:
          governanceSuspended = false;
          break;
        default:
          break;
      }
    }
    return GovernanceRegistryState(
      events: List.from(_events),
      activePolicies: activePolicies,
      pendingProposals: pendingProposals,
      deprecatedPolicies: deprecated,
      governanceSuspended: governanceSuspended,
    );
  }

  Set<String> getActivePolicies() => rebuildState().activePolicies;
  Set<String> getPendingProposals() => rebuildState().pendingProposals;
  bool isGovernanceSuspended() => rebuildState().governanceSuspended;

  bool validateGovernanceRegistry() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'policyId': e.policyId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class GovernanceRegistryState {
  const GovernanceRegistryState({
    this.events = const [],
    this.activePolicies = const {},
    this.pendingProposals = const {},
    this.deprecatedPolicies = const {},
    this.governanceSuspended = false,
  });
  final List<GovernanceEvent> events;
  final Set<String> activePolicies;
  final Set<String> pendingProposals;
  final Set<String> deprecatedPolicies;
  final bool governanceSuspended;
}
