// ODA-5 — Which domains participate in federation. Replay-reconstructable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class FederationMembershipEventType {
  FederationMembershipEventType._();
  static const String domainAssignedToFederation = 'DOMAIN_ASSIGNED_TO_FEDERATION';
  static const String domainRemovedFromFederation = 'DOMAIN_REMOVED_FROM_FEDERATION';
}

class FederationMembershipEvent {
  const FederationMembershipEvent({
    required this.eventType,
    required this.domainId,
    required this.federationId,
    required this.participationScope,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String domainId;
  final String federationId;
  final String participationScope;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class DomainFederationEntry {
  const DomainFederationEntry({
    required this.federationId,
    required this.participationScope,
    required this.active,
  });
  final String federationId;
  final String participationScope;
  final bool active;
}

class FederationMembershipLedger {
  FederationMembershipLedger();

  final List<FederationMembershipEvent> _events = [];

  List<FederationMembershipEvent> get events => List.unmodifiable(_events);

  void assignDomainToFederation(FederationMembershipEvent event) {
    if (event.eventType != FederationMembershipEventType.domainAssignedToFederation) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void removeDomainFromFederation(FederationMembershipEvent event) {
    if (event.eventType != FederationMembershipEventType.domainRemovedFromFederation) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void appendMembershipEvent(FederationMembershipEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  FederationMembershipState rebuildState() {
    final domainToFederation = <String, DomainFederationEntry>{};
    for (final e in _events) {
      if (e.eventType == FederationMembershipEventType.domainAssignedToFederation) {
        domainToFederation[e.domainId] = DomainFederationEntry(
          federationId: e.federationId,
          participationScope: e.participationScope,
          active: true,
        );
      } else if (e.eventType == FederationMembershipEventType.domainRemovedFromFederation) {
        domainToFederation.remove(e.domainId);
      }
    }
    return FederationMembershipState(
      events: List.from(_events),
      domainEntries: Map.unmodifiable(domainToFederation),
    );
  }

  bool isDomainInFederation(String domainId, String federationId) {
    final entry = rebuildState().domainEntries[domainId];
    return entry != null && entry.federationId == federationId && entry.active;
  }

  bool validateFederationMembership() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getMembershipLedgerHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'domainId': e.domainId,
          'federationId': e.federationId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class FederationMembershipState {
  const FederationMembershipState({
    this.events = const [],
    this.domainEntries = const {},
  });
  final List<FederationMembershipEvent> events;
  final Map<String, DomainFederationEntry> domainEntries;
}
