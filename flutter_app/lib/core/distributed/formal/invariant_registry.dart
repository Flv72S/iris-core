// ODA-8 — Event-sourced invariant management. Replay-reconstructable.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class InvariantEventType {
  InvariantEventType._();
  static const String invariantRegistered = 'INVARIANT_REGISTERED';
  static const String invariantActivated = 'INVARIANT_ACTIVATED';
  static const String invariantDeprecated = 'INVARIANT_DEPRECATED';
}

class InvariantEvent {
  const InvariantEvent({
    required this.eventType,
    required this.invariantId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String invariantId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class InvariantRegistry {
  InvariantRegistry();

  final List<InvariantEvent> _events = [];

  List<InvariantEvent> get events => List.unmodifiable(_events);

  void registerInvariant(InvariantEvent event) {
    if (event.eventType != InvariantEventType.invariantRegistered) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void activateInvariant(InvariantEvent event) {
    if (event.eventType != InvariantEventType.invariantActivated) return;
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  void appendInvariantEvent(InvariantEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  InvariantRegistryState rebuildState() {
    final active = <String>{};
    final deprecated = <String>{};
    for (final e in _events) {
      switch (e.eventType) {
        case InvariantEventType.invariantActivated:
          deprecated.remove(e.invariantId);
          active.add(e.invariantId);
          break;
        case InvariantEventType.invariantDeprecated:
          active.remove(e.invariantId);
          deprecated.add(e.invariantId);
          break;
        default:
          break;
      }
    }
    return InvariantRegistryState(
      events: List.from(_events),
      activeInvariantIds: active,
    );
  }

  Set<String> getActiveInvariants() => rebuildState().activeInvariantIds;

  bool validateInvariantRegistry() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'invariantId': e.invariantId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class InvariantRegistryState {
  const InvariantRegistryState({
    this.events = const [],
    this.activeInvariantIds = const {},
  });
  final List<InvariantEvent> events;
  final Set<String> activeInvariantIds;
}
