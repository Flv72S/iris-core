/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_transition.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';

ExampleState exampleTransition(ExampleState state, DeterministicEvent event) {
  if (event is! IncrementCounterEvent) {
    throw ArgumentError('event must be IncrementCounterEvent');
  }
  return ExampleState(
    name: state.name,
    counter: state.counter + event.amount,
    tags: List<String>.from(state.tags),
    stateVersion: state.stateVersion + 1,
  );
}

DeterministicTransition<ExampleState, IncrementCounterEvent> get exampleIncrementTransition =>
    exampleTransition;
