/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
/// Any use of DateTime, Random, IO, async side effects is forbidden.

import 'dart:collection';

import 'package:iris_flutter_app/core/deterministic/base/deterministic_state.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

class DeterministicLedger<S extends DeterministicState> {
  DeterministicLedger() : _snapshots = [];

  DeterministicLedger._withSnapshots(List<StateSnapshot<S>> list)
      : _snapshots = List.from(list);

  /// For tests only: builds a ledger from a list without append validation.
  /// Use to verify that [verifyFullChain] detects tampered chains.
  factory DeterministicLedger.fromSnapshotListForTest(
          List<StateSnapshot<S>> snapshots) =>
      DeterministicLedger<S>._withSnapshots(snapshots);

  final List<StateSnapshot<S>> _snapshots;

  List<StateSnapshot<S>> get snapshots =>
      UnmodifiableListView<StateSnapshot<S>>(_snapshots);

  StateSnapshot<S>? get latestSnapshot =>
      _snapshots.isEmpty ? null : _snapshots.last;

  int get length => _snapshots.length;

  void append(StateSnapshot<S> snapshot) {
    if (_snapshots.isEmpty) {
      if (snapshot.transitionIndex != 0) {
        throw DeterministicViolation(
          'Genesis snapshot must have transitionIndex 0',
        );
      }
      final expectedChainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: snapshot.stateHash,
        stateVersion: snapshot.stateVersion,
        transitionIndex: snapshot.transitionIndex,
        protocolVersion: snapshot.protocolVersion,
      );
      if (snapshot.chainHash != expectedChainHash) {
        throw DeterministicViolation(
          'Genesis chainHash mismatch: expected $expectedChainHash, got ${snapshot.chainHash}',
        );
      }
    } else {
      final previous = _snapshots.last;
      if (snapshot.transitionIndex != previous.transitionIndex + 1) {
        throw DeterministicViolation(
          'Sequential transitionIndex violated: expected ${previous.transitionIndex + 1}, got ${snapshot.transitionIndex}',
        );
      }
      if (snapshot.stateVersion != previous.stateVersion + 1) {
        throw DeterministicViolation(
          'Strict stateVersion increment violated: expected ${previous.stateVersion + 1}, got ${snapshot.stateVersion}',
        );
      }
      final expectedChainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previous.chainHash,
        stateHash: snapshot.stateHash,
        stateVersion: snapshot.stateVersion,
        transitionIndex: snapshot.transitionIndex,
        protocolVersion: snapshot.protocolVersion,
      );
      if (snapshot.chainHash != expectedChainHash) {
        throw DeterministicViolation(
          'ChainHash mismatch: expected $expectedChainHash, got ${snapshot.chainHash}',
        );
      }
    }
    _snapshots.add(snapshot);
  }

  bool verifyFullChain() {
    int previousChainHash = SnapshotChainHasher.genesisChainHash;
    for (var i = 0; i < _snapshots.length; i++) {
      final s = _snapshots[i];
      if (s.transitionIndex != (i == 0 ? 0 : _snapshots[i - 1].transitionIndex + 1)) {
        throw DeterministicViolation(
          'verifyFullChain: transitionIndex sequence broken at index $i',
        );
      }
      if (i > 0 && s.stateVersion != _snapshots[i - 1].stateVersion + 1) {
        throw DeterministicViolation(
          'verifyFullChain: stateVersion sequence broken at index $i',
        );
      }
      final expected = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: previousChainHash,
        stateHash: s.stateHash,
        stateVersion: s.stateVersion,
        transitionIndex: s.transitionIndex,
        protocolVersion: s.protocolVersion,
      );
      if (s.chainHash != expected) {
        throw DeterministicViolation(
          'verifyFullChain: chain corruption at index $i (expected $expected, got ${s.chainHash})',
        );
      }
      previousChainHash = s.chainHash;
    }
    return true;
  }

  StateSnapshot<S>? getSnapshotAt(int index) {
    if (index < 0) {
      throw DeterministicViolation('getSnapshotAt: index must be >= 0');
    }
    if (index >= _snapshots.length) return null;
    return _snapshots[index];
  }
}
