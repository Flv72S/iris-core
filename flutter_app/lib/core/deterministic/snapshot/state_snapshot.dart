/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';

class StateSnapshot<S extends DeterministicState> {
  StateSnapshot({
    required this.state,
    required this.stateHash,
    required this.stateVersion,
    required this.transitionIndex,
    required this.chainHash,
    this.protocolVersion = DeterministicProtocolVersion.initial,
  }) {
    if (transitionIndex < 0) {
      throw DeterministicViolation('transitionIndex must be >= 0');
    }
  }

  final S state;
  final int stateHash;
  final int stateVersion;
  final int transitionIndex;
  final int chainHash;
  final DeterministicProtocolVersion protocolVersion;

  factory StateSnapshot.fromState({
    required S state,
    required int transitionIndex,
    required int chainHash,
    DeterministicProtocolVersion protocolVersion = DeterministicProtocolVersion.initial,
  }) {
    if (transitionIndex < 0) {
      throw DeterministicViolation('transitionIndex must be >= 0');
    }
    return StateSnapshot<S>(
      state: state,
      stateHash: state.deterministicHash,
      stateVersion: state.stateVersion,
      transitionIndex: transitionIndex,
      chainHash: chainHash,
      protocolVersion: protocolVersion,
    );
  }

  void verifyIntegrity() {
    if (stateHash != state.deterministicHash) {
      throw DeterministicViolation('stateHash != state.deterministicHash');
    }
    if (stateVersion != state.stateVersion) {
      throw DeterministicViolation('stateVersion != state.stateVersion');
    }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is StateSnapshot<S> &&
        stateHash == other.stateHash &&
        stateVersion == other.stateVersion &&
        transitionIndex == other.transitionIndex &&
        chainHash == other.chainHash &&
        protocolVersion.major == other.protocolVersion.major &&
        protocolVersion.minor == other.protocolVersion.minor;
  }

  @override
  int get hashCode => Object.hash(
        stateHash,
        stateVersion,
        transitionIndex,
        chainHash,
        protocolVersion.major,
        protocolVersion.minor,
      );
}
