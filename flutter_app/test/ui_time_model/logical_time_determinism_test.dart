// Phase 11.4.2 — Same sequence → same tick; order guaranteed; no system dependency.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/time_model/logical_time.dart';

void main() {
  test('initial has tick 0', () {
    expect(LogicalTime.initial.tick, 0);
    expect(LogicalTime.initial.origin, 'initial');
  });

  test('next increments tick deterministically', () {
    final t0 = LogicalTime.initial;
    final t1 = t0.next();
    final t2 = t1.next();
    expect(t1.tick, 1);
    expect(t2.tick, 2);
    expect(t1.origin, 'initial');
    expect(t2.origin, 'initial');
  });

  test('same sequence yields same tick sequence', () {
    var t = LogicalTime.initial;
    final ticks = <int>[];
    for (var i = 0; i < 5; i++) {
      ticks.add(t.tick);
      t = t.next(origin: 'trace');
    }
    expect(ticks, [0, 1, 2, 3, 4]);
    // Replay: same sequence
    var t2 = LogicalTime.initial;
    final ticks2 = <int>[];
    for (var i = 0; i < 5; i++) {
      ticks2.add(t2.tick);
      t2 = t2.next(origin: 'trace');
    }
    expect(ticks2, ticks);
  });

  test('equality and hashCode deterministic', () {
    final a = LogicalTime(tick: 1, origin: 'trace');
    final b = LogicalTime(tick: 1, origin: 'trace');
    final c = LogicalTime(tick: 2, origin: 'trace');
    expect(a, equals(b));
    expect(a.hashCode, b.hashCode);
    expect(a, isNot(equals(c)));
  });

  test('next with custom origin', () {
    final t = LogicalTime.initial.next(origin: 'trace');
    expect(t.origin, 'trace');
    expect(t.tick, 1);
  });
}
