/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'package:iris_flutter_app/core/deterministic/compatibility/protocol_version.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/utils/canonical_serializer.dart';
import 'package:iris_flutter_app/core/deterministic/utils/deterministic_hash.dart';

class SnapshotChainHasher {
  SnapshotChainHasher._();

  static const int genesisChainHash = 0;

  static int computeNextChainHash({
    required int previousChainHash,
    required int stateHash,
    required int stateVersion,
    required int transitionIndex,
    DeterministicProtocolVersion protocolVersion = DeterministicProtocolVersion.initial,
  }) {
    if (transitionIndex == 0 && previousChainHash != genesisChainHash) {
      throw DeterministicViolation(
        'When transitionIndex is 0, previousChainHash must equal genesisChainHash',
      );
    }
    final map = <String, dynamic>{
      'previousChainHash': previousChainHash,
      'protocolVersionMajor': protocolVersion.major,
      'protocolVersionMinor': protocolVersion.minor,
      'stateHash': stateHash,
      'stateVersion': stateVersion,
      'transitionIndex': transitionIndex,
    };
    final bytes = CanonicalSerializer.canonicalSerialize(map);
    return DeterministicHash.computeDeterministicHash(bytes);
  }

  static void verifyChainLink({
    required int previousChainHash,
    required int expectedChainHash,
    required int stateHash,
    required int stateVersion,
    required int transitionIndex,
    DeterministicProtocolVersion protocolVersion = DeterministicProtocolVersion.initial,
  }) {
    final computed = computeNextChainHash(
      previousChainHash: previousChainHash,
      stateHash: stateHash,
      stateVersion: stateVersion,
      transitionIndex: transitionIndex,
      protocolVersion: protocolVersion,
    );
    if (computed != expectedChainHash) {
      throw DeterministicViolation(
        'Chain link tampered: computed $computed != expected $expectedChainHash',
      );
    }
  }
}
