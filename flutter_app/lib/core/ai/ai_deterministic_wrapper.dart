// OX8 — Wrap AI output in deterministic envelope.

import 'package:iris_flutter_app/core/ai/ai_projection_context.dart';
import 'package:iris_flutter_app/core/ai/ai_sandbox.dart';
import 'package:iris_flutter_app/core/ai/ai_serializer.dart';
import 'package:iris_flutter_app/core/ai/ai_suggestion_envelope.dart';

class AIDeterministicWrapper {
  AIDeterministicWrapper({required this.sandbox});
  final AISandbox sandbox;

  AISuggestionEnvelope wrap(String prompt, DeterministicContext context) {
    final inputHash = context.inputHash;
    final suggestion = sandbox.executeSuggestion(prompt, context);
    final outCanon = _canon(suggestion.output);
    final envelopeHash = AISerializer.hashOutput(outCanon);
    return AISuggestionEnvelope(
      suggestionId: suggestion.suggestionId,
      inputHash: inputHash,
      suggestion: suggestion.copyWith(output: outCanon),
      envelopeHash: envelopeHash,
    );
  }

  static Map<String, dynamic> _canon(Map<String, dynamic> output) {
    final keys = output.keys.toList()..sort();
    final out = <String, dynamic>{};
    for (final k in keys) {
      final v = output[k];
      out[k] = v is Map<String, dynamic> ? _canon(v) : (v is List ? List.from(v) : v);
    }
    return out;
  }
}
