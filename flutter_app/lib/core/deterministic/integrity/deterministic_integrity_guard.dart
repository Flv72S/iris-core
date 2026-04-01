/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_transition.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

class DeterministicIntegrityGuard<S extends DeterministicState, E extends DeterministicEvent> {
  DeterministicIntegrityGuard({
    this.strictMode = true,
  });

  final bool strictMode;

  void validateTransition({
    required S previousState,
    required E event,
    required S newState,
  }) {
    if (identical(previousState, newState)) {
      throw DeterministicViolation(
        'Transition produced same instance as previous state',
      );
    }
    if (newState.deterministicHash == previousState.deterministicHash) {
      throw DeterministicViolation(
        'Transition produced state with same deterministicHash as previous',
      );
    }
  }

  void validateSnapshot({
    required StateSnapshot<S> snapshot,
    required StateSnapshot<S>? previousSnapshot,
  }) {
    snapshot.verifyIntegrity();
    if (previousSnapshot == null) {
      if (snapshot.transitionIndex != 0) {
        throw DeterministicViolation(
          'Genesis snapshot must have transitionIndex 0, got ${snapshot.transitionIndex}',
        );
      }
      if (snapshot.stateVersion != 1) {
        throw DeterministicViolation(
          'Genesis snapshot must have stateVersion 1, got ${snapshot.stateVersion}',
        );
      }
      final expectedChainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: snapshot.stateHash,
        stateVersion: snapshot.stateVersion,
        transitionIndex: snapshot.transitionIndex,
        protocolVersion: snapshot.protocolVersion,
      );
      if (snapshot.chainHash != expectedChainHash) {
        throw DeterministicViolation(
          'Genesis chainHash mismatch: expected $expectedChainHash, got ${snapshot.chainHash}',
        );
      }
      return;
    }
    if (snapshot.transitionIndex != previousSnapshot.transitionIndex + 1) {
      throw DeterministicViolation(
        'transitionIndex must increment by 1: expected ${previousSnapshot.transitionIndex + 1}, got ${snapshot.transitionIndex}',
      );
    }
    if (snapshot.stateVersion != previousSnapshot.stateVersion + 1) {
      throw DeterministicViolation(
        'stateVersion must increment by 1: expected ${previousSnapshot.stateVersion + 1}, got ${snapshot.stateVersion}',
      );
    }
    final expectedChainHash = SnapshotChainHasher.computeNextChainHash(
      previousChainHash: previousSnapshot.chainHash,
      stateHash: snapshot.stateHash,
      stateVersion: snapshot.stateVersion,
      transitionIndex: snapshot.transitionIndex,
      protocolVersion: snapshot.protocolVersion,
    );
    if (snapshot.chainHash != expectedChainHash) {
      throw DeterministicViolation(
        'chainHash mismatch: expected $expectedChainHash, got ${snapshot.chainHash}',
      );
    }
  }

  void validateLedgerIntegrity(DeterministicLedger<S> ledger) {
    ledger.verifyFullChain();
    for (var i = 0; i < ledger.length; i++) {
      final s = ledger.getSnapshotAt(i)!;
      if (s.transitionIndex != i) {
        throw DeterministicViolation(
          'Ledger gap: index $i has transitionIndex ${s.transitionIndex}',
        );
      }
      if (i > 0) {
        final prev = ledger.getSnapshotAt(i - 1)!;
        if (s.stateVersion != prev.stateVersion + 1) {
          throw DeterministicViolation(
            'Ledger stateVersion not monotonic at index $i',
          );
        }
      }
    }
  }

  void validateStrictReplay({
    required List<E> events,
    required DeterministicLedger<S> ledger,
    required S initialState,
    required DeterministicTransition<S, E> transition,
  }) {
    if (!strictMode) return;
    final replayEngine = DeterministicReplayEngine<S, E>(
      initialState: initialState,
      transition: transition,
    );
    replayEngine.verifyAgainstLedger(events: events, ledger: ledger);
  }
}
