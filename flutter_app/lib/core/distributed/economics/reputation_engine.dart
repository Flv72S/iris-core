// ODA-7 — Reputation derived from events only. Integer-based; deterministic.

import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';

class ReputationEngine {
  ReputationEngine._();

  static int computeReputation(String actorId, EconomicLedger ledger) {
    var score = 0;
    for (final e in ledger.events) {
      if (e.actorId != actorId) continue;
      switch (e.eventType) {
        case EconomicEventType.rewardGranted:
          score += 1;
          break;
        case EconomicEventType.penaltyApplied:
          score -= 1;
          break;
        default:
          break;
      }
    }
    return score;
  }

  static int getReputation(String actorId, EconomicLedger ledger) {
    return computeReputation(actorId, ledger);
  }
}
