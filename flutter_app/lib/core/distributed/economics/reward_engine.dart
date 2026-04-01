// ODA-7 — Deterministic reward computation. Pure function; integer only.

import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';

class RewardEngine {
  RewardEngine._();

  /// Pure deterministic reward. [context] must be ledger-derived; no time/random. Returns integer.
  static int calculateReward(Map<String, dynamic> context) {
    final amount = context['amount'] as int? ?? 0;
    if (amount < 0) return 0;
    return amount;
  }

  static void grantReward(String actorId, int amount, EconomicLedger ledger) {
    if (amount < 0) return;
    ledger.appendEconomicEvent(EconomicEvent(
      eventType: EconomicEventType.rewardGranted,
      eventIndex: ledger.events.length,
      actorId: actorId,
      amount: amount,
      payload: {},
      signature: '',
    ));
  }
}
