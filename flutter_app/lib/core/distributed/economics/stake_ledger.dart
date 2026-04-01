// ODA-7 — Locked stake per actor. Reconstructable via replay.

import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';

class StakeLedger {
  StakeLedger({this.ledger});

  EconomicLedger? ledger;

  int getLockedStake(String actorId) {
    if (ledger == null) return 0;
    var locked = 0;
    for (final e in ledger!.events) {
      if (e.actorId != actorId) continue;
      if (e.eventType == EconomicEventType.stakeLocked) locked += e.amount;
      if (e.eventType == EconomicEventType.stakeReleased) locked -= e.amount;
    }
    return locked > 0 ? locked : 0;
  }

  void lockStake(String actorId, int amount, EconomicLedger targetLedger) {
    targetLedger.appendEconomicEvent(EconomicEvent(
      eventType: EconomicEventType.stakeLocked,
      eventIndex: targetLedger.events.length,
      actorId: actorId,
      amount: amount,
      payload: {},
      signature: '',
    ));
  }

  void releaseStake(String actorId, int amount, EconomicLedger targetLedger) {
    targetLedger.appendEconomicEvent(EconomicEvent(
      eventType: EconomicEventType.stakeReleased,
      eventIndex: targetLedger.events.length,
      actorId: actorId,
      amount: amount,
      payload: {},
      signature: '',
    ));
  }
}
