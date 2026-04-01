// OX8 — AI Co-Pilot: suggestions from projection context; deterministic envelope; no direct mutation.

import 'package:iris_flutter_app/core/ai/ai_audit.dart';
import 'package:iris_flutter_app/core/ai/ai_deterministic_wrapper.dart';
import 'package:iris_flutter_app/core/ai/ai_intent_mapper.dart';
import 'package:iris_flutter_app/core/ai/ai_projection_context.dart';
import 'package:iris_flutter_app/core/ai/ai_sandbox.dart';
import 'package:iris_flutter_app/core/ai/ai_serializer.dart';
import 'package:iris_flutter_app/core/ai/ai_suggestion_envelope.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

/// Generates suggestions from projection state. Outputs are deterministic envelopes;
/// only user confirmation + signature + ledger append makes them canonical.
class AICoPilotEngine {
  AICoPilotEngine({
    required AISandbox sandbox,
    AIAudit? audit,
  })  : _wrapper = AIDeterministicWrapper(sandbox: sandbox),
        _audit = audit ?? AIAudit();

  final AIDeterministicWrapper _wrapper;
  final AIAudit _audit;

  /// Builds deterministic context from [snapshot] and its hash. Caller provides snapshot from projections.
  DeterministicContext buildContext(Map<String, dynamic> snapshot) {
    final keys = snapshot.keys.toList()..sort();
    final canonical = Map<String, dynamic>.fromEntries(keys.map((k) => MapEntry(k, snapshot[k])));
    final inputHash = AISerializer.hashInput(canonical);
    return DeterministicContext(snapshot: canonical, inputHash: inputHash);
  }

  /// Generates suggestion for [prompt] given [context]. Ephemeral; not committed.
  AISuggestionEnvelope generateSuggestion(String prompt, DeterministicContext context) {
    final envelope = _wrapper.wrap(prompt, context);
    _audit.suggestionGenerated(
      envelope.suggestionId,
      envelope.inputHash,
      envelope.suggestion.modelIdentifier,
    );
    return envelope;
  }

  /// Maps suggestion to UIIntent. Caller must validate, get user confirmation, then sign and append.
  UIIntent? suggestionToIntent(AISuggestionEnvelope envelope) {
    return AIIntentMapper.suggestionToIntent(envelope.suggestion);
  }

  /// Call when user confirms suggestion (before signing). For audit only.
  void onConfirmed(AISuggestionEnvelope envelope) {
    _audit.suggestionConfirmed(
      envelope.suggestionId,
      envelope.inputHash,
      envelope.suggestion.modelIdentifier,
    );
  }

  /// Call when user rejects suggestion. For audit only.
  void onRejected(AISuggestionEnvelope envelope) {
    _audit.suggestionRejected(
      envelope.suggestionId,
      envelope.inputHash,
      envelope.suggestion.modelIdentifier,
    );
  }

  /// Call when fork invalidates suggestion. For audit only.
  void onInvalidatedByFork(AISuggestionEnvelope envelope) {
    _audit.suggestionInvalidatedByFork(envelope.suggestionId, envelope.inputHash);
  }
}
