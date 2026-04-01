// Phase 11.2.2 — Abstract intent channel. No execution, no retry, no semantics.

import '../dto/decision_trace_dto.dart';
import '../intents/action_intent.dart';
import '../intents/mode_change_intent.dart';

/// Sends intents to Core and returns a decision trace. No client-side execution.
abstract class IntentChannel {
  Future<DecisionTraceDto> sendAction(ActionIntent intent);
  Future<DecisionTraceDto> sendModeChange(ModeChangeIntent intent);
}
