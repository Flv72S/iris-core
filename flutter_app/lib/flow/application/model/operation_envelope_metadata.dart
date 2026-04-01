// L1 — Operation envelope metadata. Immutable; defensive copy of attributes.

/// Application-level metadata for an operation envelope. Attributes are unmodifiable.
class OperationEnvelopeMetadata {
  OperationEnvelopeMetadata({required Map<String, String> attributes})
      : attributes = Map.unmodifiable(Map<String, String>.from(attributes));

  final Map<String, String> attributes;
}
