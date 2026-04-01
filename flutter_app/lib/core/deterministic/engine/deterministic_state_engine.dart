/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/integrity/deterministic_integrity_guard.dart';
import 'package:iris_flutter_app/core/deterministic/transition/deterministic_transition_executor.dart';

class DeterministicStateEngine<S extends DeterministicState, E extends DeterministicEvent> {
  DeterministicStateEngine({
    required S initialState,
    required DeterministicTransitionExecutor<S, E> executor,
    this.integrityGuard,
  })  : _currentState = initialState,
        _executor = executor,
        _currentEventIndex = 0 {
    if (initialState.stateVersion < 0) {
      throw DeterministicViolation('initialState.stateVersion must be >= 0');
    }
  }

  S _currentState;
  int _currentEventIndex;
  final DeterministicTransitionExecutor<S, E> _executor;

  final DeterministicIntegrityGuard<S, E>? integrityGuard;

  S get currentState => _currentState;
  int get currentEventIndex => _currentEventIndex;

  S applyEvent(E event) {
    if (event.eventIndex != _currentEventIndex + 1) {
      throw DeterministicViolation(
        'event.eventIndex must be ${_currentEventIndex + 1}, got ${event.eventIndex}',
      );
    }
    final previousState = _currentState;
    final nextState = _executor.apply(_currentState, event);
    if (nextState.stateVersion != _currentState.stateVersion + 1) {
      throw DeterministicViolation('State version must increment by 1');
    }
    integrityGuard?.validateTransition(
      previousState: previousState,
      event: event,
      newState: nextState,
    );
    _currentState = nextState;
    _currentEventIndex = event.eventIndex;
    return nextState;
  }
}
