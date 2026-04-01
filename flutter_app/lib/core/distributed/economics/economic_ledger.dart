// ODA-7 — Core economic accounting. Append-only; balances derived from events.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

class EconomicEventType {
  EconomicEventType._();
  static const String stakeLocked = 'STAKE_LOCKED';
  static const String stakeReleased = 'STAKE_RELEASED';
  static const String rewardGranted = 'REWARD_GRANTED';
  static const String penaltyApplied = 'PENALTY_APPLIED';
  static const String balanceTransferred = 'BALANCE_TRANSFERRED';
  static const String reputationUpdated = 'REPUTATION_UPDATED';
}

class EconomicEvent {
  const EconomicEvent({
    required this.eventType,
    required this.eventIndex,
    required this.actorId,
    required this.amount,
    this.targetActorId,
    required this.payload,
    required this.signature,
  });
  final String eventType;
  final int eventIndex;
  final String actorId;
  final int amount;
  final String? targetActorId;
  final Map<String, dynamic> payload;
  final String signature;
}

class EconomicLedger {
  EconomicLedger();

  final List<EconomicEvent> _events = [];

  List<EconomicEvent> get events => List.unmodifiable(_events);

  void appendEconomicEvent(EconomicEvent event) {
    if (event.eventIndex != _events.length) return;
    if (event.amount < 0) return;
    _events.add(event);
  }

  /// Balance derived from events only. No stored balance.
  int getBalance(String actorId) {
    var balance = 0;
    for (final e in _events) {
      if (e.actorId == actorId) {
        switch (e.eventType) {
          case EconomicEventType.rewardGranted:
          case EconomicEventType.stakeReleased:
            balance += e.amount;
            break;
          case EconomicEventType.penaltyApplied:
          case EconomicEventType.stakeLocked:
          case EconomicEventType.balanceTransferred:
            balance -= e.amount;
            break;
          default:
            break;
        }
      }
      if (e.targetActorId == actorId && e.eventType == EconomicEventType.balanceTransferred) {
        balance += e.amount; // receiver
      }
    }
    return balance;
  }

  String getLedgerHash() {
    final payloads = _events.map((e) => <String, dynamic>{
          'eventType': e.eventType,
          'eventIndex': e.eventIndex,
          'actorId': e.actorId,
          'amount': e.amount,
          if (e.targetActorId != null) 'targetActorId': e.targetActorId,
          'payload': e.payload,
        }).toList();
    return CanonicalPayload.hash(<String, dynamic>{'events': payloads});
  }
}
