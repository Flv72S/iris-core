import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';

void main() {
  group('SnapshotChainHasher', () {
    test('Genesis snapshot produces deterministic chainHash', () {
      const stateHash = 100;
      const stateVersion = 1;
      const transitionIndex = 0;
      final h1 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: stateHash,
        stateVersion: stateVersion,
        transitionIndex: transitionIndex,
      );
      final h2 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: stateHash,
        stateVersion: stateVersion,
        transitionIndex: transitionIndex,
      );
      expect(h1, h2);
    });

    test('Two identical chains produce identical final hash', () {
      int prev = SnapshotChainHasher.genesisChainHash;
      for (var i = 0; i < 3; i++) {
        prev = SnapshotChainHasher.computeNextChainHash(
          previousChainHash: prev,
          stateHash: 10 + i,
          stateVersion: 1 + i,
          transitionIndex: i,
        );
      }
      final chain1Final = prev;

      prev = SnapshotChainHasher.genesisChainHash;
      for (var i = 0; i < 3; i++) {
        prev = SnapshotChainHasher.computeNextChainHash(
          previousChainHash: prev,
          stateHash: 10 + i,
          stateVersion: 1 + i,
          transitionIndex: i,
        );
      }
      final chain2Final = prev;
      expect(chain1Final, chain2Final);
    });

    test('Changing stateHash changes chainHash', () {
      final h1 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 100,
        stateVersion: 1,
        transitionIndex: 0,
      );
      final h2 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 101,
        stateVersion: 1,
        transitionIndex: 0,
      );
      expect(h1, isNot(h2));
    });

    test('Changing stateVersion changes chainHash', () {
      final h1 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 100,
        stateVersion: 1,
        transitionIndex: 0,
      );
      final h2 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 100,
        stateVersion: 2,
        transitionIndex: 0,
      );
      expect(h1, isNot(h2));
    });

    test('Changing transitionIndex changes chainHash', () {
      final h0 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 100,
        stateVersion: 1,
        transitionIndex: 0,
      );
      final h1 = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: h0,
        stateHash: 200,
        stateVersion: 2,
        transitionIndex: 1,
      );
      final h1Alt = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: h0,
        stateHash: 200,
        stateVersion: 2,
        transitionIndex: 2,
      );
      expect(h1, isNot(h1Alt));
    });

    test('Changing order of snapshots produces different final chainHash', () {
      int prevA = SnapshotChainHasher.genesisChainHash;
      prevA = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: prevA,
        stateHash: 1,
        stateVersion: 1,
        transitionIndex: 0,
      );
      prevA = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: prevA,
        stateHash: 2,
        stateVersion: 2,
        transitionIndex: 1,
      );
      prevA = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: prevA,
        stateHash: 3,
        stateVersion: 3,
        transitionIndex: 2,
      );

      int prevB = SnapshotChainHasher.genesisChainHash;
      prevB = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: prevB,
        stateHash: 2,
        stateVersion: 2,
        transitionIndex: 0,
      );
      prevB = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: prevB,
        stateHash: 1,
        stateVersion: 1,
        transitionIndex: 1,
      );
      prevB = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: prevB,
        stateHash: 3,
        stateVersion: 3,
        transitionIndex: 2,
      );

      expect(prevA, isNot(prevB));
    });

    test('verifyChainLink passes for correct data', () {
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 42,
        stateVersion: 1,
        transitionIndex: 0,
      );
      expect(
        () => SnapshotChainHasher.verifyChainLink(
          previousChainHash: SnapshotChainHasher.genesisChainHash,
          expectedChainHash: chainHash,
          stateHash: 42,
          stateVersion: 1,
          transitionIndex: 0,
        ),
        returnsNormally,
      );
    });

    test('verifyChainLink throws for tampered data', () {
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: SnapshotChainHasher.genesisChainHash,
        stateHash: 42,
        stateVersion: 1,
        transitionIndex: 0,
      );
      expect(
        () => SnapshotChainHasher.verifyChainLink(
          previousChainHash: SnapshotChainHasher.genesisChainHash,
          expectedChainHash: chainHash,
          stateHash: 43,
          stateVersion: 1,
          transitionIndex: 0,
        ),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });

  group('SnapshotChainHasher genesis rule', () {
    test('transitionIndex 0 with non-genesis previousChainHash throws', () {
      expect(
        () => SnapshotChainHasher.computeNextChainHash(
          previousChainHash: 999,
          stateHash: 100,
          stateVersion: 1,
          transitionIndex: 0,
        ),
        throwsA(isA<DeterministicViolation>()),
      );
    });
  });
}
