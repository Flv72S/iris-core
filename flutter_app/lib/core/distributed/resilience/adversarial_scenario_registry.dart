// ODA-9 — Event-sourced incident registry. Replay-reconstructable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class IncidentEventType {
  IncidentEventType._();
  static const String incidentDetected = 'INCIDENT_DETECTED';
  static const String incidentClassified = 'INCIDENT_CLASSIFIED';
  static const String incidentContained = 'INCIDENT_CONTAINED';
  static const String recoveryInitiated = 'RECOVERY_INITIATED';
  static const String recoveryCompleted = 'RECOVERY_COMPLETED';
  static const String incidentClosed = 'INCIDENT_CLOSED';
}

class IncidentEvent {
  const IncidentEvent({
    required this.eventType,
    required this.incidentId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String incidentId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class AdversarialScenarioRegistry {
  AdversarialScenarioRegistry();

  final List<IncidentEvent> _events = [];

  List<IncidentEvent> get events => List.unmodifiable(_events);

  void registerIncidentEvent(IncidentEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  AdversarialScenarioState rebuildState() {
    final active = <String>{};
    final closed = <String>{};
    for (final e in _events) {
      switch (e.eventType) {
        case IncidentEventType.incidentDetected:
        case IncidentEventType.incidentClassified:
        case IncidentEventType.incidentContained:
        case IncidentEventType.recoveryInitiated:
          closed.remove(e.incidentId);
          active.add(e.incidentId);
          break;
        case IncidentEventType.recoveryCompleted:
        case IncidentEventType.incidentClosed:
          active.remove(e.incidentId);
          closed.add(e.incidentId);
          break;
        default:
          break;
      }
    }
    return AdversarialScenarioState(
      events: List.from(_events),
      activeIncidentIds: active,
    );
  }

  Set<String> getActiveIncidents() => rebuildState().activeIncidentIds;

  bool validateIncidentRegistry() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'incidentId': e.incidentId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class AdversarialScenarioState {
  const AdversarialScenarioState({
    this.events = const [],
    this.activeIncidentIds = const {},
  });
  final List<IncidentEvent> events;
  final Set<String> activeIncidentIds;
}
