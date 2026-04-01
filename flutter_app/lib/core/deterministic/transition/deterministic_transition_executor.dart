/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_transition.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';

class DeterministicTransitionExecutor<S extends DeterministicState, E extends DeterministicEvent> {
  DeterministicTransitionExecutor(this.transition);

  final DeterministicTransition<S, E> transition;

  S apply(S currentState, E event) {
    final nextState = transition(currentState, event);
    if (nextState == null) {
      throw DeterministicViolation('transition returned null');
    }
    if (identical(nextState, currentState)) {
      throw DeterministicViolation('transition returned same instance');
    }
    if (nextState.stateVersion != currentState.stateVersion + 1) {
      throw DeterministicViolation('State version must increment by 1');
    }
    return nextState;
  }
}
