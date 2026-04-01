// OX8 — AI suggestion model. Not ledger state; only confirmed suggestions become canonical.

/// AI suggestion. Output is external; only user confirmation + signature + append makes it canonical.
/// suggestionId is deterministically derived from inputHash + modelIdentifier.
class AISuggestion {
  const AISuggestion({
    required this.suggestionId,
    required this.type,
    required this.inputHash,
    required this.output,
    required this.modelIdentifier,
    this.createdAtHeight,
  });

  final String suggestionId;
  final String type;
  final String inputHash;
  final Map<String, dynamic> output;
  final String modelIdentifier;
  /// Populated only if suggestion was confirmed and committed; null for ephemeral.
  final int? createdAtHeight;

  AISuggestion copyWith({
    String? suggestionId,
    String? type,
    String? inputHash,
    Map<String, dynamic>? output,
    String? modelIdentifier,
    int? createdAtHeight,
  }) {
    return AISuggestion(
      suggestionId: suggestionId ?? this.suggestionId,
      type: type ?? this.type,
      inputHash: inputHash ?? this.inputHash,
      output: output ?? Map<String, dynamic>.from(this.output),
      modelIdentifier: modelIdentifier ?? this.modelIdentifier,
      createdAtHeight: createdAtHeight ?? this.createdAtHeight,
    );
  }
}
