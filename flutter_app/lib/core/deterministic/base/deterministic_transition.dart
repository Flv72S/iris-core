/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_event.dart';
import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';

typedef DeterministicTransition<S extends DeterministicState, E extends DeterministicEvent>
    = S Function(S state, E event);
