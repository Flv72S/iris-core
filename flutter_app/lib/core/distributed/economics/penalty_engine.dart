// ODA-7 — Deterministic penalty. Auditable; integer only.

import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';

class PenaltyEngine {
  PenaltyEngine._();

  static int calculatePenalty(Map<String, dynamic> context) {
    final amount = context['amount'] as int? ?? 0;
    if (amount < 0) return 0;
    return amount;
  }

  static void applyPenalty(String actorId, int amount, EconomicLedger ledger, {Map<String, dynamic>? payload}) {
    if (amount < 0) return;
    ledger.appendEconomicEvent(EconomicEvent(
      eventType: EconomicEventType.penaltyApplied,
      eventIndex: ledger.events.length,
      actorId: actorId,
      amount: amount,
      payload: payload ?? {},
      signature: '',
    ));
  }
}
