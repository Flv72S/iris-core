// ODA-1 — Event-sourced cluster membership. Append-only; all events signed.

import 'package:iris_flutter_app/core/distributed/deterministic_cluster_hasher.dart';

class MembershipEventType {
  MembershipEventType._();
  static const String nodeJoinRequest = 'NODE_JOIN_REQUEST';
  static const String nodeAdmitted = 'NODE_ADMITTED';
  static const String nodeRemoved = 'NODE_REMOVED';
  static const String nodeSuspended = 'NODE_SUSPENDED';
}

class MembershipEvent {
  const MembershipEvent({
    required this.eventType,
    required this.payload,
    required this.eventIndex,
    required this.signature,
  });
  final String eventType;
  final Map<String, dynamic> payload;
  final int eventIndex;
  final String signature;
}

class MembershipState {
  const MembershipState({
    this.events = const [],
    this.activeNodeIds = const {},
    this.suspendedNodeIds = const {},
    this.removedNodeIds = const {},
  });
  final List<MembershipEvent> events;
  final Set<String> activeNodeIds;
  final Set<String> suspendedNodeIds;
  final Set<String> removedNodeIds;
}

class ClusterMembershipLedger {
  ClusterMembershipLedger({this.clusterId = ''});

  final String clusterId;
  final List<MembershipEvent> _events = [];

  List<MembershipEvent> get events => List.unmodifiable(_events);

  void appendMembershipEvent(MembershipEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  MembershipState rebuildState() {
    final active = <String>{};
    final suspended = <String>{};
    final removed = <String>{};
    for (final e in _events) {
      final nodeId = e.payload['nodeId'] as String? ?? '';
      switch (e.eventType) {
        case MembershipEventType.nodeAdmitted:
          removed.remove(nodeId);
          suspended.remove(nodeId);
          active.add(nodeId);
          break;
        case MembershipEventType.nodeRemoved:
          active.remove(nodeId);
          suspended.remove(nodeId);
          removed.add(nodeId);
          break;
        case MembershipEventType.nodeSuspended:
          active.remove(nodeId);
          suspended.add(nodeId);
          break;
        default:
          break;
      }
    }
    return MembershipState(
      events: List.from(_events),
      activeNodeIds: active,
      suspendedNodeIds: suspended,
      removedNodeIds: removed,
    );
  }

  Set<String> getActiveNodes() => rebuildState().activeNodeIds;

  bool validateMembershipLedger() {
    for (var i = 0; i < _events.length; i++) {
      if (_events[i].eventIndex != i) return false;
      if (_events[i].signature.isEmpty) return false;
    }
    return true;
  }

  String getMembershipLedgerHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'eventIndex': e.eventIndex,
          'payload': e.payload,
        }).toList();
    return DeterministicClusterHasher.membershipLedgerHash(payloads);
  }
}
