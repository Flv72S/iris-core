// ODA-10 — Track external interaction events. Append-only.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class InteroperabilityLedgerEventType {
  InteroperabilityLedgerEventType._();
  static const String externalProofAccepted = 'EXTERNAL_PROOF_ACCEPTED';
  static const String externalOperationExecuted = 'EXTERNAL_OPERATION_EXECUTED';
  static const String externalSettlementCompleted = 'EXTERNAL_SETTLEMENT_COMPLETED';
  static const String externalOperationRejected = 'EXTERNAL_OPERATION_REJECTED';
}

class InteroperabilityLedgerEvent {
  const InteroperabilityLedgerEvent({
    required this.eventType,
    required this.eventIndex,
    required this.externalSystemId,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final int eventIndex;
  final String externalSystemId;
  final Map<String, dynamic> payload;
  final String signature;
}

class InteroperabilityLedger {
  InteroperabilityLedger();

  final List<InteroperabilityLedgerEvent> _events = [];

  List<InteroperabilityLedgerEvent> get events => List.unmodifiable(_events);

  void appendInteroperabilityEvent(InteroperabilityLedgerEvent event) {
    if (event.eventIndex != _events.length) return;
    _events.add(event);
  }

  InteroperabilityLedgerState reconstructInteroperabilityState() {
    final accepted = <String>[];
    final rejected = <String>[];
    final executed = <String>[];
    final settlements = <String>[];
    for (final e in _events) {
      switch (e.eventType) {
        case InteroperabilityLedgerEventType.externalProofAccepted:
          accepted.add(e.payload['proofId'] as String? ?? e.externalSystemId);
          break;
        case InteroperabilityLedgerEventType.externalOperationRejected:
          rejected.add(e.payload['reason'] as String? ?? '');
          break;
        case InteroperabilityLedgerEventType.externalOperationExecuted:
          executed.add(e.payload['operationId'] as String? ?? '');
          break;
        case InteroperabilityLedgerEventType.externalSettlementCompleted:
          settlements.add(e.payload['settlementId'] as String? ?? '');
          break;
        default:
          break;
      }
    }
    return InteroperabilityLedgerState(
      events: List.from(_events),
      acceptedProofIds: accepted,
      rejectedReasons: rejected,
      executedOperationIds: executed,
      settlementIds: settlements,
    );
  }

  String getLedgerHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'eventIndex': e.eventIndex,
          'externalSystemId': e.externalSystemId,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}

class InteroperabilityLedgerState {
  const InteroperabilityLedgerState({
    this.events = const [],
    this.acceptedProofIds = const [],
    this.rejectedReasons = const [],
    this.executedOperationIds = const [],
    this.settlementIds = const [],
  });
  final List<InteroperabilityLedgerEvent> events;
  final List<String> acceptedProofIds;
  final List<String> rejectedReasons;
  final List<String> executedOperationIds;
  final List<String> settlementIds;
}
