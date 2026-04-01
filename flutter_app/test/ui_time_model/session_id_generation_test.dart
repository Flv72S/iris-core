// Phase 11.4.2 — Session start yields new SessionId; same log yields same sequence; no random/timestamp.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/time_model/session_id.dart';
import 'package:iris_flutter_app/ui/time_model/time_context_controller.dart';

void main() {
  test('explicit session start yields new sessionId', () async {
    final controller = TimeContextController();
    final ctx0 = controller.current;
    expect(ctx0.sessionId.value, 'session-0');

    final ctx1 = await controller.onSessionStart();
    expect(ctx1.sessionId.value, 'session-1');

    final ctx2 = await controller.onSessionStart();
    expect(ctx2.sessionId.value, 'session-2');
  });

  test('replay same sequence yields same sessionId sequence', () async {
    final a = TimeContextController();
    final idsA = <String>[
      a.current.sessionId.value,
      (await a.onSessionStart()).sessionId.value,
      (await a.onSessionStart()).sessionId.value,
    ];

    final b = TimeContextController();
    final idsB = <String>[
      b.current.sessionId.value,
      (await b.onSessionStart()).sessionId.value,
      (await b.onSessionStart()).sessionId.value,
    ];
    expect(idsB, idsA);
    expect(idsA[0], 'session-0');
    expect(idsA[1], 'session-1');
    expect(idsA[2], 'session-2');
  });

  test('SessionId equality', () {
    const s1 = SessionId('session-1');
    const s2 = SessionId('session-1');
    const s3 = SessionId('session-2');
    expect(s1, equals(s2));
    expect(s1.hashCode, s2.hashCode);
    expect(s1, isNot(equals(s3)));
  });
}
