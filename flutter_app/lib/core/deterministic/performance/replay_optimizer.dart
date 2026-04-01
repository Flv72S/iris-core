/// O11 — Replay from snapshot; output bit-identical to baseline.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

class ReplayOptimizer<S extends DeterministicState, E extends DeterministicEvent> {
  ReplayOptimizer({required DeterministicReplayEngine<S, E> engine}) : _engine = engine;
  final DeterministicReplayEngine<S, E> _engine;

  S replayFrom(StateSnapshot<S> snapshot, List<E> events) {
    S state = snapshot.state;
    for (final event in events) {
      state = _engine.transition(state, event) as S;
    }
    return state;
  }
}
