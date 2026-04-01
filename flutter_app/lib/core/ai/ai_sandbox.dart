// OX8 — AI execution isolation. No state mutation; no ledger/FS/network/keys.

import 'package:iris_flutter_app/core/ai/ai_projection_context.dart';
import 'package:iris_flutter_app/core/ai/ai_suggestion.dart';
import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';

/// Runs AI in isolation. Cannot access file system, ledger, network, or identity private keys.
/// Only returns a pure suggestion; never mutates state or deterministic core.
/// This implementation uses a deterministic stub: same (prompt, context) → same suggestion.
class AISandbox {
  AISandbox({
    this.modelIdentifier = 'stub.v1',
    Map<String, dynamic> Function(String prompt, DeterministicContext context)? stub,
  }) : _stub = stub ?? _defaultStub;

  final String modelIdentifier;
  final Map<String, dynamic> Function(String prompt, DeterministicContext context) _stub;

  /// Executes suggestion generation. No state mutation; no core access.
  /// Returns deterministic suggestion for same inputs.
  AISuggestion executeSuggestion(String prompt, DeterministicContext context) {
    final output = _stub(prompt, context);
    final inputHash = context.inputHash;
    final suggestionId = _deterministicSuggestionId(inputHash, modelIdentifier);
    return AISuggestion(
      suggestionId: suggestionId,
      type: _suggestionTypeFromPrompt(prompt),
      inputHash: inputHash,
      output: Map<String, dynamic>.from(output),
      modelIdentifier: modelIdentifier,
      createdAtHeight: null,
    );
  }

  static String _deterministicSuggestionId(String inputHash, String modelId) {
    final combined = '$inputHash|$modelId';
    final bytes = CanonicalPayload.serialize(<String, dynamic>{'s': combined});
    final h = CanonicalPayload.hashFromBytes(bytes);
    return 'sug_${h.substring(0, 16)}';
  }

  static String _suggestionTypeFromPrompt(String prompt) {
    final p = prompt.toLowerCase();
    if (p.contains('task')) return 'create_task';
    if (p.contains('decision')) return 'resolve_decision';
    if (p.contains('agreement')) return 'sign_agreement';
    if (p.contains('link') || p.contains('node')) return 'link_nodes';
    return 'suggestion';
  }
}

// Default stub: deterministic output from prompt + context hash.
Map<String, dynamic> _defaultStub(String prompt, DeterministicContext context) {
  return <String, dynamic>{
    'prompt': prompt,
    'inputHash': context.inputHash,
    'hint': 'Confirm to apply',
  };
}
