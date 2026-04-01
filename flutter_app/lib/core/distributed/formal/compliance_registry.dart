// ODA-8 — Event-sourced compliance rules.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class ComplianceEventType {
  ComplianceEventType._();
  static const String complianceRuleRegistered = 'COMPLIANCE_RULE_REGISTERED';
  static const String complianceRuleActivated = 'COMPLIANCE_RULE_ACTIVATED';
  static const String complianceRuleDeprecated = 'COMPLIANCE_RULE_DEPRECATED';
}

class ComplianceEvent {
  const ComplianceEvent({
    required this.eventType,
    required this.ruleId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String ruleId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class ComplianceRegistry {
  ComplianceRegistry();

  final List<ComplianceEvent> _events = [];

  List<ComplianceEvent> get events => List.unmodifiable(_events);

  void registerComplianceRule(ComplianceEvent event) {
    if (event.eventType != ComplianceEventType.complianceRuleRegistered) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void activateComplianceRule(ComplianceEvent event) {
    if (event.eventType != ComplianceEventType.complianceRuleActivated) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void appendComplianceEvent(ComplianceEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  ComplianceRegistryState rebuildState() {
    final active = <String>{};
    for (final e in _events) {
      if (e.eventType == ComplianceEventType.complianceRuleActivated) active.add(e.ruleId);
      if (e.eventType == ComplianceEventType.complianceRuleDeprecated) active.remove(e.ruleId);
    }
    return ComplianceRegistryState(events: List.from(_events), activeRuleIds: active);
  }

  Set<String> getActiveComplianceRules() => rebuildState().activeRuleIds;

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'ruleId': e.ruleId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class ComplianceRegistryState {
  const ComplianceRegistryState({this.events = const [], this.activeRuleIds = const {}});
  final List<ComplianceEvent> events;
  final Set<String> activeRuleIds;
}
