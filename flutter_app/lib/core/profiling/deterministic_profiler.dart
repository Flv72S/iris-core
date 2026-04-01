/// Observational profiling of deterministic execution cost.
/// Timing is used only here; never passed into or stored in the deterministic core.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_transition.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';
import 'package:iris_flutter_app/core/profiling/profiling_result.dart';

class DeterministicProfiler<S extends DeterministicState, E extends DeterministicEvent> {
  DeterministicProfiler({
    this.protocolVersion = DeterministicProtocolVersion.initial,
  });

  final DeterministicProtocolVersion protocolVersion;

  /// Measures execution cost of applying [events] from [initialState] with [transition].
  /// Does not alter deterministic behavior; timing is observational only.
  ProfilingResult profileExecution({
    required S initialState,
    required List<E> events,
    required DeterministicTransition<S, E> transition,
  }) {
    var totalTransition = Duration.zero;
    var totalSnapshot = Duration.zero;
    var totalHash = Duration.zero;
    var totalAppend = Duration.zero;

    final ledger = DeterministicLedger<S>();
    S currentState = initialState;
    int previousChainHash = SnapshotChainHasher.genesisChainHash;
    int transitionIndex = 0;

    for (final event in events) {
      S newState;
      final swTransition = Stopwatch()..start();
      newState = transition(currentState, event);
      swTransition.stop();
      totalTransition += swTransition.elapsed;

      int chainHash;
      final swHash = Stopwatch()..start();
      chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previousChainHash,
        stateHash: newState.deterministicHash,
        stateVersion: newState.stateVersion,
        transitionIndex: transitionIndex,
        protocolVersion: protocolVersion,
      );
      swHash.stop();
      totalHash += swHash.elapsed;

      StateSnapshot<S> snapshot;
      final swSnapshot = Stopwatch()..start();
      snapshot = StateSnapshot<S>.fromState(
        state: newState,
        transitionIndex: transitionIndex,
        chainHash: chainHash,
        protocolVersion: protocolVersion,
      );
      swSnapshot.stop();
      totalSnapshot += swSnapshot.elapsed;

      final swAppend = Stopwatch()..start();
      ledger.append(snapshot);
      swAppend.stop();
      totalAppend += swAppend.elapsed;

      previousChainHash = snapshot.chainHash;
      currentState = newState;
      transitionIndex++;
    }

    final engine = DeterministicReplayEngine<S, E>(
      initialState: initialState,
      transition: transition,
      protocolVersion: protocolVersion,
    );
    final swReplay = Stopwatch()..start();
    engine.replay(events);
    swReplay.stop();
    final totalReplay = swReplay.elapsed;

    return ProfilingResult(
      transitionCount: events.length,
      totalTransitionTime: totalTransition,
      totalSnapshotTime: totalSnapshot,
      totalHashTime: totalHash,
      totalLedgerAppendTime: totalAppend,
      totalReplayTime: totalReplay,
    );
  }
}
