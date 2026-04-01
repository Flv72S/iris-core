// ODA-4 — Event-sourced registry of trust domains. Append-only; replay-reconstructable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class DomainRegistryEventType {
  DomainRegistryEventType._();
  static const String domainCreated = 'DOMAIN_CREATED';
  static const String domainActivated = 'DOMAIN_ACTIVATED';
  static const String domainSuspended = 'DOMAIN_SUSPENDED';
  static const String domainDeprecated = 'DOMAIN_DEPRECATED';
}

class DomainRegistryEvent {
  const DomainRegistryEvent({
    required this.eventType,
    required this.domainId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String domainId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class TrustDomainRegistry {
  TrustDomainRegistry();

  final List<DomainRegistryEvent> _events = [];

  List<DomainRegistryEvent> get events => List.unmodifiable(_events);

  void appendDomainEvent(DomainRegistryEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  /// Rebuild state from events. Deterministic.
  DomainRegistryState rebuildState() {
    final active = <String>{};
    final suspended = <String>{};
    final deprecated = <String>{};
    for (final e in _events) {
      switch (e.eventType) {
        case DomainRegistryEventType.domainCreated:
        case DomainRegistryEventType.domainActivated:
          deprecated.remove(e.domainId);
          suspended.remove(e.domainId);
          active.add(e.domainId);
          break;
        case DomainRegistryEventType.domainSuspended:
          active.remove(e.domainId);
          suspended.add(e.domainId);
          break;
        case DomainRegistryEventType.domainDeprecated:
          active.remove(e.domainId);
          suspended.remove(e.domainId);
          deprecated.add(e.domainId);
          break;
        default:
          break;
      }
    }
    return DomainRegistryState(
      events: List.from(_events),
      activeDomainIds: active,
      suspendedDomainIds: suspended,
      deprecatedDomainIds: deprecated,
    );
  }

  Set<String> getActiveDomains() => rebuildState().activeDomainIds;
  Set<String> getSuspendedDomains() => rebuildState().suspendedDomainIds;

  bool validateDomainRegistry() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'domainId': e.domainId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class DomainRegistryState {
  const DomainRegistryState({
    this.events = const [],
    this.activeDomainIds = const {},
    this.suspendedDomainIds = const {},
    this.deprecatedDomainIds = const {},
  });
  final List<DomainRegistryEvent> events;
  final Set<String> activeDomainIds;
  final Set<String> suspendedDomainIds;
  final Set<String> deprecatedDomainIds;
}
