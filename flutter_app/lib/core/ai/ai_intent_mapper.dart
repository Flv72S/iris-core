// OX8 — Map suggestion to UIIntent. No auto-commit.

import 'package:iris_flutter_app/core/ai/ai_suggestion.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

class AIIntentMapper {
  static UIIntent? suggestionToIntent(AISuggestion suggestion) {
    final type = suggestion.type;
    final payload = Map<String, dynamic>.from(suggestion.output);
    final intentId = suggestion.suggestionId;
    switch (type) {
      case 'create_task':
        return UIIntent(type: 'create_task', payload: payload, intentId: intentId, targetProjectionId: 'tasks');
      case 'resolve_decision':
        return UIIntent(type: 'resolve_decision', payload: payload, intentId: intentId, targetProjectionId: 'decisions');
      case 'sign_agreement':
        return UIIntent(type: 'sign_agreement', payload: payload, intentId: intentId, targetProjectionId: 'agreements');
      case 'link_nodes':
        return UIIntent(type: 'link_nodes', payload: payload, intentId: intentId, targetProjectionId: 'knowledge');
      default:
        return UIIntent(type: type, payload: payload, intentId: intentId, targetProjectionId: null);
    }
  }
}
