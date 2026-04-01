// Phase 11.3.3 — Pure static mapping. No interpretation.

import 'package:iris_flutter_app/bridge/dto/decision_trace_dto.dart';

/// Maps trace to route name. Structural matching only. Unknown → "unknown_trace".
String mapTraceToRoute(DecisionTraceDto trace) {
  if (trace.resolution == 'explainability') {
    return 'explainability';
  }
  return 'unknown_trace';
}
