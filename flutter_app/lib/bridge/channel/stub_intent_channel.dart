// Phase 11.2.2 — Deterministic stub for tests. No time, no random.

import '../dto/decision_trace_dto.dart';
import '../dto/outcome_dto.dart';
import '../intents/action_intent.dart';
import '../intents/mode_change_intent.dart';
import 'intent_channel.dart';

/// Fixed trace returned for every call. Idempotent; for certification and replay.
class StubIntentChannel implements IntentChannel {
  StubIntentChannel();

  static DecisionTraceDto _fixedTrace() {
    return DecisionTraceDto(
      traceId: 'stub-trace-1',
      signals: <String, dynamic>{},
      state: <String, dynamic>{},
      resolution: 'stub',
      execution: <String, dynamic>{},
      outcome: const OutcomeDto(status: 'ok', effects: <dynamic>[]),
      timestamp: '1970-01-01T00:00:00Z',
    );
  }

  @override
  Future<DecisionTraceDto> sendAction(ActionIntent intent) async {
    return _fixedTrace();
  }

  @override
  Future<DecisionTraceDto> sendModeChange(ModeChangeIntent intent) async {
    return _fixedTrace();
  }
}
