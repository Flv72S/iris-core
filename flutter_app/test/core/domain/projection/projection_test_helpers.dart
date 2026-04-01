/// Shared projection test helpers.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/domain/projection/projection_definition.dart';

class TestProjectionEvent implements DeterministicEvent {
  TestProjectionEvent({required this.eventIndex, required this.value});
  @override
  final int eventIndex;
  @override
  int get deterministicHash => Object.hash(eventIndex, value);
  @override
  String get source => 'test';
  final int value;
}

class CounterProjectionState {
  const CounterProjectionState(this.count);
  final int count;
}

class CounterProjectionDefinition extends ProjectionDefinition<CounterProjectionState> {
  CounterProjectionDefinition({this.projectionId = 'counter', this.version = 1});
  @override
  final String projectionId;
  final int version;

  @override
  String get id => projectionId;

  @override
  CounterProjectionState initialState() => const CounterProjectionState(0);

  @override
  CounterProjectionState applyEvent(CounterProjectionState state, DeterministicEvent event) {
    if (event is TestProjectionEvent) {
      return CounterProjectionState(state.count + event.value);
    }
    return state;
  }

  @override
  int getVersion() => version;

  @override
  Map<String, dynamic> stateToCanonicalMap(CounterProjectionState state) =>
      <String, dynamic>{'count': state.count};
}

class SumProjectionState {
  const SumProjectionState(this.sum);
  final int sum;
}

class SumProjectionDefinition extends ProjectionDefinition<SumProjectionState> {
  @override
  String get id => 'other';
  @override
  SumProjectionState initialState() => const SumProjectionState(0);
  @override
  SumProjectionState applyEvent(SumProjectionState state, DeterministicEvent event) {
    if (event is TestProjectionEvent) return SumProjectionState(state.sum + event.value);
    return state;
  }
  @override
  int getVersion() => 1;
  @override
  Map<String, dynamic> stateToCanonicalMap(SumProjectionState state) =>
      <String, dynamic>{'sum': state.sum};
}
