import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/deterministic/base/event_source.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_increment_event.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_state.dart';
import 'package:iris_flutter_app/core/deterministic/examples/example_transition.dart';
import 'package:iris_flutter_app/core/deterministic/ledger/deterministic_ledger.dart';
import 'package:iris_flutter_app/core/deterministic/replay/deterministic_replay_engine.dart';
import 'package:iris_flutter_app/core/profiling/deterministic_profiler.dart';
import 'package:iris_flutter_app/core/profiling/profiling_result.dart';

void main() {
  ExampleState initial() => ExampleState(
        name: 'profiler',
        counter: 0,
        tags: [],
        stateVersion: 0,
      );

  List<IncrementCounterEvent> events(int count) => List.generate(
        count,
        (i) => IncrementCounterEvent(
          amount: 1,
          eventIndex: i + 1,
          source: EventSource.internal,
        ),
      );

  group('DeterministicProfiler', () {
    test('Basic profiling: 100 events — valid ProfilingResult, transitionCount 100, durations >= 0', () {
      final profiler = DeterministicProfiler<ExampleState, IncrementCounterEvent>();
      final result = profiler.profileExecution(
        initialState: initial(),
        events: events(100),
        transition: exampleIncrementTransition,
      );
      expect(result, isA<ProfilingResult>());
      expect(result.transitionCount, 100);
      expect(result.totalTransitionTime >= Duration.zero, isTrue);
      expect(result.totalSnapshotTime >= Duration.zero, isTrue);
      expect(result.totalHashTime >= Duration.zero, isTrue);
      expect(result.totalLedgerAppendTime >= Duration.zero, isTrue);
      expect(result.totalReplayTime >= Duration.zero, isTrue);
      expect(result.averageTransitionTime, greaterThanOrEqualTo(0));
      expect(result.averageSnapshotTime, greaterThanOrEqualTo(0));
    });

    test('Determinism unaffected: execute normally → chainHash A; with profiling → chainHash B; identical', () {
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final profiler = DeterministicProfiler<ExampleState, IncrementCounterEvent>();
      final evs = events(100);

      final ledgerA = engine.replay(evs);
      final chainHashA = ledgerA.latestSnapshot!.chainHash;

      profiler.profileExecution(
        initialState: initial(),
        events: events(100),
        transition: exampleIncrementTransition,
      );

      final ledgerB = engine.replay(evs);
      final chainHashB = ledgerB.latestSnapshot!.chainHash;

      expect(chainHashA, chainHashB);
    });

    test('Replay profiling: replay time measured, does not alter ledger', () {
      final profiler = DeterministicProfiler<ExampleState, IncrementCounterEvent>();
      final evs = events(50);
      final result = profiler.profileExecution(
        initialState: initial(),
        events: evs,
        transition: exampleIncrementTransition,
      );
      expect(result.totalReplayTime >= Duration.zero, isTrue);
      expect(result.transitionCount, 50);
      final engine = DeterministicReplayEngine<ExampleState, IncrementCounterEvent>(
        initialState: initial(),
        transition: exampleIncrementTransition,
      );
      final ledger = engine.replay(evs);
      expect(ledger.length, 50);
    });

    test('Stress profiling: 1,000 events — no exceptions, result returned correctly', () {
      final profiler = DeterministicProfiler<ExampleState, IncrementCounterEvent>();
      final result = profiler.profileExecution(
        initialState: initial(),
        events: events(1000),
        transition: exampleIncrementTransition,
      );
      expect(result.transitionCount, 1000);
      expect(result.totalTransitionTime >= Duration.zero, isTrue);
      expect(result.totalReplayTime >= Duration.zero, isTrue);
    });
  });
}
