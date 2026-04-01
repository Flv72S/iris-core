// OX8 — Deterministic wrapper for AI suggestion. Same input → same envelope.

import 'package:iris_flutter_app/core/ai/ai_suggestion.dart';

/// Deterministic envelope containing a suggestion. Used for storage/audit; not a ledger event.
class AISuggestionEnvelope {
  const AISuggestionEnvelope({
    required this.suggestionId,
    required this.inputHash,
    required this.suggestion,
    required this.envelopeHash,
  });

  final String suggestionId;
  final String inputHash;
  final AISuggestion suggestion;
  /// Hash of canonical suggestion payload for integrity.
  final String envelopeHash;
}
