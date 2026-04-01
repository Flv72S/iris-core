/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';

class DummyState implements DeterministicState {
  @override
  int get deterministicHash => 0;

  @override
  List<int> get canonicalBytes => [0];

  @override
  int get stateVersion => 0;
}

class DummyEvent implements DeterministicEvent {
  @override
  int get deterministicHash => 0;

  @override
  int get eventIndex => 0;

  @override
  String get source => 'internal';
}
