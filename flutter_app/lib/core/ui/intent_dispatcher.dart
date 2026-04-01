/// OX4 — Dispatches validated intents to domain; emits ledger events via callback.

import 'package:iris_flutter_app/core/ui/intent_validator.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

/// Converts valid intent into event payload (or event). Called after validation.
typedef IntentToEvent = Map<String, dynamic>? Function(UIIntent intent);

/// Dispatches user intents: validate then convert to event and hand to sink.
class IntentDispatcher {
  IntentDispatcher({
    required IntentValidator validator,
    required void Function(Map<String, dynamic> eventPayload) onValidIntent,
    IntentToEvent? intentToEvent,
  })  : _validator = validator,
        _onValidIntent = onValidIntent,
        _intentToEvent = intentToEvent;

  final IntentValidator _validator;
  final void Function(Map<String, dynamic> eventPayload) _onValidIntent;
  final IntentToEvent? _intentToEvent;

  /// Validates [intent] with [context]; if valid, converts to event and calls [onValidIntent].
  void dispatch(UIIntent intent, ValidationContext context) {
    final result = _validator.validate(intent, context);
    if (!result.valid) {
      throw IntentRejectedException(result.message);
    }
    final payload = _intentToEvent?.call(intent);
    if (payload != null) {
      _onValidIntent(payload);
    }
  }
}

class IntentRejectedException implements Exception {
  IntentRejectedException(this.message);
  final String message;
}
