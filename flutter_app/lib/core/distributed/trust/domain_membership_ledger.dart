// ODA-4 — Which nodes belong to which domain. One domain per node; transfers approved.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class DomainMembershipEventType {
  DomainMembershipEventType._();
  static const String nodeAssignedToDomain = 'NODE_ASSIGNED_TO_DOMAIN';
  static const String nodeRemovedFromDomain = 'NODE_REMOVED_FROM_DOMAIN';
  static const String nodeDomainTransferRequest = 'NODE_DOMAIN_TRANSFER_REQUEST';
  static const String nodeDomainTransferApproved = 'NODE_DOMAIN_TRANSFER_APPROVED';
}

class DomainMembershipEvent {
  const DomainMembershipEvent({
    required this.eventType,
    required this.nodeId,
    required this.domainId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String nodeId;
  final String domainId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class DomainMembershipLedger {
  DomainMembershipLedger();

  final List<DomainMembershipEvent> _events = [];

  List<DomainMembershipEvent> get events => List.unmodifiable(_events);

  void assignNodeToDomain(DomainMembershipEvent event) {
    if (event.eventType != DomainMembershipEventType.nodeAssignedToDomain) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void removeNodeFromDomain(DomainMembershipEvent event) {
    if (event.eventType != DomainMembershipEventType.nodeRemovedFromDomain) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void appendMembershipEvent(DomainMembershipEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  DomainMembershipState rebuildState() {
    final nodeToDomain = <String, String>{};
    final pendingTransfers = <String, String>{};
    for (final e in _events) {
      switch (e.eventType) {
        case DomainMembershipEventType.nodeAssignedToDomain:
          nodeToDomain[e.nodeId] = e.domainId;
          pendingTransfers.remove(e.nodeId);
          break;
        case DomainMembershipEventType.nodeRemovedFromDomain:
          nodeToDomain.remove(e.nodeId);
          pendingTransfers.remove(e.nodeId);
          break;
        case DomainMembershipEventType.nodeDomainTransferRequest:
          pendingTransfers[e.nodeId] = e.domainId;
          break;
        case DomainMembershipEventType.nodeDomainTransferApproved:
          nodeToDomain[e.nodeId] = e.domainId;
          pendingTransfers.remove(e.nodeId);
          break;
        default:
          break;
      }
    }
    return DomainMembershipState(
      events: List.from(_events),
      nodeToDomain: Map.unmodifiable(nodeToDomain),
    );
  }

  String? getNodeDomain(String nodeId) => rebuildState().nodeToDomain[nodeId];

  bool validateDomainMembership() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getMembershipLedgerHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'nodeId': e.nodeId,
          'domainId': e.domainId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class DomainMembershipState {
  const DomainMembershipState({
    this.events = const [],
    this.nodeToDomain = const {},
  });
  final List<DomainMembershipEvent> events;
  final Map<String, String> nodeToDomain;
}
