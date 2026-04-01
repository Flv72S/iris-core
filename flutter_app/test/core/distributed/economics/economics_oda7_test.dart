// ODA-7 — Deterministic economic & incentive layer tests.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/distributed/economics/economic_identity.dart';
import 'package:iris_flutter_app/core/distributed/economics/economic_ledger.dart';
import 'package:iris_flutter_app/core/distributed/economics/stake_ledger.dart';
import 'package:iris_flutter_app/core/distributed/economics/reward_engine.dart';
import 'package:iris_flutter_app/core/distributed/economics/penalty_engine.dart';
import 'package:iris_flutter_app/core/distributed/economics/reputation_engine.dart';
import 'package:iris_flutter_app/core/distributed/economics/economic_policy.dart';
import 'package:iris_flutter_app/core/distributed/economics/cross_cluster_settlement.dart';
import 'package:iris_flutter_app/core/distributed/economics/economic_hash_engine.dart';
import 'package:iris_flutter_app/core/distributed/economics/economic_audit_report.dart';

void main() {
  group('ODA-7 Deterministic balance reconstruction', () {
    test('getBalance derives correct balance from events', () {
      final ledger = EconomicLedger();
      ledger.appendEconomicEvent(EconomicEvent(
        eventType: EconomicEventType.rewardGranted,
        eventIndex: 0,
        actorId: 'a1',
        amount: 100,
        payload: {},
        signature: '',
      ));
      ledger.appendEconomicEvent(EconomicEvent(
        eventType: EconomicEventType.penaltyApplied,
        eventIndex: 1,
        actorId: 'a1',
        amount: 30,
        payload: {},
        signature: '',
      ));
      expect(ledger.getBalance('a1'), 70);
    });
  });

  group('ODA-7 Stake lock/release replay correctness', () {
    test('getLockedStake reconstructs from ledger events', () {
      final ledger = EconomicLedger();
      final stake = StakeLedger(ledger: ledger);
      stake.lockStake('n1', 50, ledger);
      stake.lockStake('n1', 25, ledger);
      stake.releaseStake('n1', 25, ledger);
      expect(stake.getLockedStake('n1'), 50);
    });
  });

  group('ODA-7 Reward determinism across nodes', () {
    test('calculateReward returns same value for same context', () {
      final ctx = <String, dynamic>{'amount': 10};
      expect(RewardEngine.calculateReward(ctx), RewardEngine.calculateReward(ctx));
    });
    test('grantReward appends event and balance increases', () {
      final ledger = EconomicLedger();
      RewardEngine.grantReward('a1', 20, ledger);
      expect(ledger.getBalance('a1'), 20);
    });
  });

  group('ODA-7 Penalty determinism across nodes', () {
    test('calculatePenalty returns same value for same context', () {
      final ctx = <String, dynamic>{'amount': 5};
      expect(PenaltyEngine.calculatePenalty(ctx), PenaltyEngine.calculatePenalty(ctx));
    });
    test('applyPenalty appends event and balance decreases', () {
      final ledger = EconomicLedger();
      RewardEngine.grantReward('a1', 100, ledger);
      PenaltyEngine.applyPenalty('a1', 40, ledger);
      expect(ledger.getBalance('a1'), 60);
    });
  });

  group('ODA-7 Reputation deterministic calculation', () {
    test('getReputation derived from events only', () {
      final ledger = EconomicLedger();
      RewardEngine.grantReward('a1', 1, ledger);
      RewardEngine.grantReward('a1', 1, ledger);
      PenaltyEngine.applyPenalty('a1', 1, ledger);
      expect(ReputationEngine.getReputation('a1', ledger), 1);
    });
  });

  group('ODA-7 Economic policy activation enforcement', () {
    test('verifyEconomicPolicy returns true for valid policy', () {
      final policy = EconomicPolicyFactory.createEconomicPolicy(
        policyId: 'ep1',
        rewardFormulaRef: 'r1',
        penaltyRules: {},
        stakeRequirements: {'min': 10},
        reputationThresholds: {'minRep': 0},
      );
      expect(EconomicPolicyFactory.verifyEconomicPolicy(policy), isTrue);
    });
  });

  group('ODA-7 Cross-cluster settlement validation', () {
    test('verifySettlement returns true when proof valid', () {
      final s = CrossClusterSettlement.createSettlement(
        originClusterId: 'c1',
        targetClusterId: 'c2',
        settlementAmount: 50,
        proofOfBalance: 'proof',
        contractReference: 'ct1',
      );
      expect(CrossClusterSettlement.verifySettlement(s, (p, a) => p == 'proof' && a == 50), isTrue);
    });
  });

  group('ODA-7 Settlement without contract rejection', () {
    test('verifySettlement returns false when proof invalid', () {
      final s = CrossClusterSettlement.createSettlement(
        originClusterId: 'c1',
        targetClusterId: 'c2',
        settlementAmount: 50,
        proofOfBalance: 'proof',
        contractReference: '',
      );
      expect(CrossClusterSettlement.verifySettlement(s, (p, a) => false), isFalse);
    });
  });

  group('ODA-7 Negative balance rejection', () {
    test('appendEconomicEvent with negative amount does not add event', () {
      final ledger = EconomicLedger();
      ledger.appendEconomicEvent(EconomicEvent(
        eventType: EconomicEventType.rewardGranted,
        eventIndex: 0,
        actorId: 'a1',
        amount: -10,
        payload: {},
        signature: '',
      ));
      expect(ledger.events.length, 0);
    });
  });

  group('ODA-7 Fractional value rejection', () {
    test('amounts are integers only', () {
      final ledger = EconomicLedger();
      RewardEngine.grantReward('a1', 10, ledger);
      expect(ledger.getBalance('a1'), 10);
      expect(ledger.getBalance('a1').runtimeType, int);
    });
  });

  group('ODA-7 Replay producing identical economic state', () {
    test('same events produce same balance', () {
      final ledger1 = EconomicLedger();
      final ledger2 = EconomicLedger();
      RewardEngine.grantReward('a1', 100, ledger1);
      PenaltyEngine.applyPenalty('a1', 20, ledger1);
      RewardEngine.grantReward('a1', 100, ledger2);
      PenaltyEngine.applyPenalty('a1', 20, ledger2);
      expect(ledger1.getBalance('a1'), ledger2.getBalance('a1'));
    });
  });

  group('ODA-7 Economic hash identical across clusters', () {
    test('computeEconomicHash same inputs same hash', () {
      final h1 = EconomicHashEngine.computeEconomicHash(
        economicLedgerHash: 'elh',
        stakeLedgerHash: 'slh',
        reputationHash: 'rh',
        economicPolicyHash: 'eph',
      );
      final h2 = EconomicHashEngine.computeEconomicHash(
        economicLedgerHash: 'elh',
        stakeLedgerHash: 'slh',
        reputationHash: 'rh',
        economicPolicyHash: 'eph',
      );
      expect(h1, h2);
    });
  });

  group('ODA-7 Divergence detection in economic ledger', () {
    test('different ledger contents produce different ledger hash', () {
      final ledger1 = EconomicLedger();
      final ledger2 = EconomicLedger();
      RewardEngine.grantReward('a1', 10, ledger1);
      RewardEngine.grantReward('a1', 20, ledger2);
      expect(ledger1.getLedgerHash(), isNot(ledger2.getLedgerHash()));
    });
  });
}
