// ODA-10 — Event-sourced registry of external systems. Replay-reconstructable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class InteroperabilityEventType {
  InteroperabilityEventType._();
  static const String externalSystemRegistered = 'EXTERNAL_SYSTEM_REGISTERED';
  static const String adapterActivated = 'ADAPTER_ACTIVATED';
  static const String bridgeContractEstablished = 'BRIDGE_CONTRACT_ESTABLISHED';
  static const String externalSystemSuspended = 'EXTERNAL_SYSTEM_SUSPENDED';
  static const String externalSystemReinstated = 'EXTERNAL_SYSTEM_REINSTATED';
}

class InteroperabilityEvent {
  const InteroperabilityEvent({
    required this.eventType,
    required this.externalSystemId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String externalSystemId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class InteroperabilityRegistry {
  InteroperabilityRegistry();

  final List<InteroperabilityEvent> _events = [];

  List<InteroperabilityEvent> get events => List.unmodifiable(_events);

  void appendInteroperabilityEvent(InteroperabilityEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  InteroperabilityRegistryState rebuildState() {
    final active = <String>{};
    final suspended = <String>{};
    for (final e in _events) {
      switch (e.eventType) {
        case InteroperabilityEventType.externalSystemRegistered:
        case InteroperabilityEventType.adapterActivated:
        case InteroperabilityEventType.bridgeContractEstablished:
        case InteroperabilityEventType.externalSystemReinstated:
          suspended.remove(e.externalSystemId);
          active.add(e.externalSystemId);
          break;
        case InteroperabilityEventType.externalSystemSuspended:
          active.remove(e.externalSystemId);
          suspended.add(e.externalSystemId);
          break;
        default:
          break;
      }
    }
    return InteroperabilityRegistryState(
      events: List.from(_events),
      activeExternalSystemIds: active,
      suspendedExternalSystemIds: suspended,
    );
  }

  Set<String> getActiveExternalSystems() => rebuildState().activeExternalSystemIds;
  bool isSuspended(String externalSystemId) => rebuildState().suspendedExternalSystemIds.contains(externalSystemId);

  bool validateInteroperabilityRegistry() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'externalSystemId': e.externalSystemId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class InteroperabilityRegistryState {
  const InteroperabilityRegistryState({
    this.events = const [],
    this.activeExternalSystemIds = const {},
    this.suspendedExternalSystemIds = const {},
  });
  final List<InteroperabilityEvent> events;
  final Set<String> activeExternalSystemIds;
  final Set<String> suspendedExternalSystemIds;
}
