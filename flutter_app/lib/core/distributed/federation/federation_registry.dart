// ODA-5 — Event-sourced registry of federated clusters. Bilateral; append-only.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class FederationEventType {
  FederationEventType._();
  static const String federationRequest = 'FEDERATION_REQUEST';
  static const String federationAccepted = 'FEDERATION_ACCEPTED';
  static const String federationRejected = 'FEDERATION_REJECTED';
  static const String federationSuspended = 'FEDERATION_SUSPENDED';
  static const String federationTerminated = 'FEDERATION_TERMINATED';
}

class FederationEvent {
  const FederationEvent({
    required this.eventType,
    required this.localClusterId,
    required this.remoteClusterId,
    required this.eventIndex,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final String localClusterId;
  final String remoteClusterId;
  final int eventIndex;
  final Map<String, dynamic> payload;
  final String signature;
}

class FederationRegistry {
  FederationRegistry();

  final List<FederationEvent> _events = [];

  List<FederationEvent> get events => List.unmodifiable(_events);

  void appendFederationEvent(FederationEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  FederationRegistryState rebuildState() {
    final active = <String>{};
    final suspended = <String>{};
    for (final e in _events) {
      final pair = _pair(e.localClusterId, e.remoteClusterId);
      switch (e.eventType) {
        case FederationEventType.federationAccepted:
          suspended.remove(pair);
          active.add(pair);
          break;
        case FederationEventType.federationSuspended:
          active.remove(pair);
          suspended.add(pair);
          break;
        case FederationEventType.federationTerminated:
        case FederationEventType.federationRejected:
          active.remove(pair);
          suspended.remove(pair);
          break;
        default:
          break;
      }
    }
    return FederationRegistryState(
      events: List.from(_events),
      activeFederationPairs: active,
      suspendedFederationPairs: suspended,
    );
  }

  static String _pair(String a, String b) => a.compareTo(b) < 0 ? '$a:$b' : '$b:$a';

  Set<String> getActiveFederations() => rebuildState().activeFederationPairs;
  Set<String> getSuspendedFederations() => rebuildState().suspendedFederationPairs;

  bool validateFederationRegistry() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getRegistryHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'localClusterId': e.localClusterId,
          'remoteClusterId': e.remoteClusterId,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class FederationRegistryState {
  const FederationRegistryState({
    this.events = const [],
    this.activeFederationPairs = const {},
    this.suspendedFederationPairs = const {},
  });
  final List<FederationEvent> events;
  final Set<String> activeFederationPairs;
  final Set<String> suspendedFederationPairs;
}
