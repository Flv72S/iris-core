/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_transition.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

class DeterministicReplayEngine<S extends DeterministicState, E extends DeterministicEvent> {
  DeterministicReplayEngine({
    required this.initialState,
    required this.transition,
    this.protocolVersion = DeterministicProtocolVersion.initial,
  });

  final S initialState;
  final DeterministicTransition<S, E> transition;
  final DeterministicProtocolVersion protocolVersion;

  DeterministicLedger<S> replay(List<E> events) {
    final ledger = DeterministicLedger<S>();
    S currentState = initialState;
    int previousChainHash = SnapshotChainHasher.genesisChainHash;
    int transitionIndex = 0;

    for (final event in events) {
      final newState = transition(currentState, event);
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previousChainHash,
        stateHash: newState.deterministicHash,
        stateVersion: newState.stateVersion,
        transitionIndex: transitionIndex,
        protocolVersion: protocolVersion,
      );
      final snapshot = StateSnapshot<S>.fromState(
        state: newState,
        transitionIndex: transitionIndex,
        chainHash: chainHash,
        protocolVersion: protocolVersion,
      );
      ledger.append(snapshot);
      previousChainHash = snapshot.chainHash;
      currentState = newState;
      transitionIndex++;
    }
    return ledger;
  }

  void verifyAgainstLedger({
    required List<E> events,
    required DeterministicLedger<S> ledger,
  }) {
    for (var i = 0; i < ledger.length; i++) {
      final snap = ledger.getSnapshotAt(i)!;
      DeterministicSchemaGuard.validateSchemaCompatibility(
        snapshotVersion: snap.protocolVersion,
        currentVersion: protocolVersion,
      );
    }
    final replayLedger = replay(events);
    if (replayLedger.length != ledger.length) {
      throw DeterministicViolation(
        'Replay divergence: length ${replayLedger.length} != ${ledger.length}',
      );
    }
    for (var i = 0; i < ledger.length; i++) {
      final a = replayLedger.getSnapshotAt(i)!;
      final b = ledger.getSnapshotAt(i)!;
      if (a.stateHash != b.stateHash) {
        throw DeterministicViolation(
          'Replay divergence at index $i: stateHash ${a.stateHash} != ${b.stateHash}',
        );
      }
      if (a.chainHash != b.chainHash) {
        throw DeterministicViolation(
          'Replay divergence at index $i: chainHash ${a.chainHash} != ${b.chainHash}',
        );
      }
      if (a.stateVersion != b.stateVersion) {
        throw DeterministicViolation(
          'Replay divergence at index $i: stateVersion ${a.stateVersion} != ${b.stateVersion}',
        );
      }
      if (a.transitionIndex != b.transitionIndex) {
        throw DeterministicViolation(
          'Replay divergence at index $i: transitionIndex ${a.transitionIndex} != ${b.transitionIndex}',
        );
      }
    }
  }
}
