// ODA-7 — Deterministic economic report. Identical on replay.

import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';
import 'package:iris_flutter_app/core/distributed/economics/stake_ledger.dart';
import 'package:iris_flutter_app/core/distributed/economics/reputation_engine.dart';

class EconomicAuditReport {
  const EconomicAuditReport({
    required this.actorBalances,
    required this.lockedStakeSummary,
    required this.reputationScores,
    required this.activeEconomicPolicyHash,
    required this.penaltyHistory,
    required this.rewardDistributionHistory,
    required this.economicHash,
    required this.divergenceFlags,
  });
  final Map<String, int> actorBalances;
  final Map<String, int> lockedStakeSummary;
  final Map<String, int> reputationScores;
  final String activeEconomicPolicyHash;
  final List<Map<String, dynamic>> penaltyHistory;
  final List<Map<String, dynamic>> rewardDistributionHistory;
  final String economicHash;
  final Map<String, bool> divergenceFlags;
}

class EconomicAuditReportGenerator {
  EconomicAuditReportGenerator._();

  static EconomicAuditReport generateEconomicAudit({
    required EconomicLedger ledger,
    required StakeLedger stakeLedger,
    required String economicHash,
    required String activeEconomicPolicyHash,
    Map<String, bool> divergenceFlags = const {},
  }) {
    final actorIds = <String>{};
    for (final e in ledger.events) {
      actorIds.add(e.actorId);
      if (e.targetActorId != null) actorIds.add(e.targetActorId!);
    }
    final balances = <String, int>{};
    final locked = <String, int>{};
    final reputation = <String, int>{};
    for (final id in actorIds) {
      balances[id] = ledger.getBalance(id);
      stakeLedger.ledger = ledger;
      locked[id] = stakeLedger.getLockedStake(id);
      reputation[id] = ReputationEngine.getReputation(id, ledger);
    }
    final penalties = ledger.events
        .where((e) => e.eventType == EconomicEventType.penaltyApplied)
        .map((e) => <String, dynamic>{'actorId': e.actorId, 'amount': e.amount, 'payload': e.payload})
        .toList();
    final rewards = ledger.events
        .where((e) => e.eventType == EconomicEventType.rewardGranted)
        .map((e) => <String, dynamic>{'actorId': e.actorId, 'amount': e.amount})
        .toList();
    return EconomicAuditReport(
      actorBalances: balances,
      lockedStakeSummary: locked,
      reputationScores: reputation,
      activeEconomicPolicyHash: activeEconomicPolicyHash,
      penaltyHistory: penalties,
      rewardDistributionHistory: rewards,
      economicHash: economicHash,
      divergenceFlags: divergenceFlags,
    );
  }
}
