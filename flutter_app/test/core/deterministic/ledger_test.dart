import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/chain/snapshot_chain_hasher.dart';
import 'package:iris_flutter_app/core/deterministic/deterministic_violation.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/snapshot/state_snapshot.dart';

StateSnapshot<ExampleState> _genesisSnapshot() {
  final state = ExampleState(
    name: 'genesis',
    counter: 0,
    tags: [],
    stateVersion: 1,
  );
  final chainHash = SnapshotChainHasher.computeNextChainHash(
    previousChainHash: SnapshotChainHasher.genesisChainHash,
    stateHash: state.deterministicHash,
    stateVersion: state.stateVersion,
    transitionIndex: 0,
  );
  return StateSnapshot<ExampleState>.fromState(
    state: state,
    transitionIndex: 0,
    chainHash: chainHash,
  );
}

StateSnapshot<ExampleState> _secondSnapshot(
  int prevChainHash,
  ExampleState previousState,
) {
  final state = ExampleState(
    name: 'second',
    counter: 1,
    tags: ['a'],
    stateVersion: previousState.stateVersion + 1,
  );
  final chainHash = SnapshotChainHasher.computeNextChainHash(
    previousChainHash: prevChainHash,
    stateHash: state.deterministicHash,
    stateVersion: state.stateVersion,
    transitionIndex: 1,
  );
  return StateSnapshot<ExampleState>.fromState(
    state: state,
    transitionIndex: 1,
    chainHash: chainHash,
  );
}

void main() {
  group('DeterministicLedger', () {
    test('Append genesis snapshot works', () {
      final ledger = DeterministicLedger<ExampleState>();
      final gen = _genesisSnapshot();
      ledger.append(gen);
      expect(ledger.length, 1);
      expect(ledger.latestSnapshot, gen);
      expect(ledger.getSnapshotAt(0), gen);
    });

    test('Appending second valid snapshot works', () {
      final ledger = DeterministicLedger<ExampleState>();
      final gen = _genesisSnapshot();
      ledger.append(gen);
      final second = _secondSnapshot(gen.chainHash, gen.state);
      ledger.append(second);
      expect(ledger.length, 2);
      expect(ledger.latestSnapshot, second);
      expect(ledger.getSnapshotAt(1), second);
    });

    test('Skipping transitionIndex throws', () {
      final ledger = DeterministicLedger<ExampleState>();
      ledger.append(_genesisSnapshot());
      final state = ExampleState(
        name: 'skip',
        counter: 2,
        tags: [],
        stateVersion: 2,
      );
      final wrongIndex = StateSnapshot<ExampleState>(
        state: state,
        stateHash: state.deterministicHash,
        stateVersion: state.stateVersion,
        transitionIndex: 2,
        chainHash: SnapshotChainHasher.computeNextChainHash(
          previousChainHash: ledger.latestSnapshot!.chainHash,
          stateHash: state.deterministicHash,
          stateVersion: state.stateVersion,
          transitionIndex: 2,
        ),
      );
      expect(
        () => ledger.append(wrongIndex),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('Wrong chainHash throws', () {
      final ledger = DeterministicLedger<ExampleState>();
      ledger.append(_genesisSnapshot());
      final gen = ledger.latestSnapshot!;
      final state = ExampleState(
        name: 'second',
        counter: 1,
        tags: ['a'],
        stateVersion: 2,
      );
      final wrongChainHash = StateSnapshot<ExampleState>(
        state: state,
        stateHash: state.deterministicHash,
        stateVersion: state.stateVersion,
        transitionIndex: 1,
        chainHash: 999999,
      );
      expect(
        () => ledger.append(wrongChainHash),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('Wrong stateVersion throws', () {
      final ledger = DeterministicLedger<ExampleState>();
      ledger.append(_genesisSnapshot());
      final gen = ledger.latestSnapshot!;
      final state = ExampleState(
        name: 'second',
        counter: 1,
        tags: ['a'],
        stateVersion: 3,
      );
      final chainHash = SnapshotChainHasher.computeNextChainHash(
        previousChainHash: gen.chainHash,
        stateHash: state.deterministicHash,
        stateVersion: state.stateVersion,
        transitionIndex: 1,
      );
      final wrongVersion = StateSnapshot<ExampleState>(
        state: state,
        stateHash: state.deterministicHash,
        stateVersion: state.stateVersion,
        transitionIndex: 1,
        chainHash: chainHash,
      );
      expect(
        () => ledger.append(wrongVersion),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('Tampering with snapshot detected by verifyFullChain()', () {
      final gen = _genesisSnapshot();
      final second = _secondSnapshot(gen.chainHash, gen.state);
      final tamperedSecond = StateSnapshot<ExampleState>(
        state: second.state,
        stateHash: second.stateHash,
        stateVersion: second.stateVersion,
        transitionIndex: second.transitionIndex,
        chainHash: 12345,
      );
      final ledger = DeterministicLedger<ExampleState>.fromSnapshotListForTest(
        [gen, tamperedSecond],
      );
      expect(
        () => ledger.verifyFullChain(),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('Ledger snapshots list is unmodifiable', () {
      final ledger = DeterministicLedger<ExampleState>();
      ledger.append(_genesisSnapshot());
      final list = ledger.snapshots;
      expect(
        () => list.add(_genesisSnapshot()),
        throwsUnsupportedError,
      );
      expect(
        () => list.clear(),
        throwsUnsupportedError,
      );
    });

    test('Two ledgers with identical snapshot sequences produce identical final chainHash', () {
      final ledger1 = DeterministicLedger<ExampleState>();
      final ledger2 = DeterministicLedger<ExampleState>();
      final gen = _genesisSnapshot();
      final second = _secondSnapshot(gen.chainHash, gen.state);
      ledger1.append(gen);
      ledger1.append(second);
      ledger2.append(_genesisSnapshot());
      ledger2.append(_secondSnapshot(ledger2.latestSnapshot!.chainHash, ledger2.latestSnapshot!.state));
      expect(ledger1.latestSnapshot!.chainHash, ledger2.latestSnapshot!.chainHash);
    });
  });

  group('DeterministicLedger getSnapshotAt', () {
    test('getSnapshotAt with negative index throws', () {
      final ledger = DeterministicLedger<ExampleState>();
      expect(
        () => ledger.getSnapshotAt(-1),
        throwsA(isA<DeterministicViolation>()),
      );
    });

    test('getSnapshotAt with index >= length returns null', () {
      final ledger = DeterministicLedger<ExampleState>();
      expect(ledger.getSnapshotAt(0), isNull);
      ledger.append(_genesisSnapshot());
      expect(ledger.getSnapshotAt(1), isNull);
    });
  });

  group('DeterministicLedger verifyFullChain', () {
    test('verifyFullChain returns true for valid ledger', () {
      final ledger = DeterministicLedger<ExampleState>();
      final gen = _genesisSnapshot();
      ledger.append(gen);
      ledger.append(_secondSnapshot(gen.chainHash, gen.state));
      expect(ledger.verifyFullChain(), true);
    });
  });
}
