// K7 — Signature metadata. No implementation; value type only.

/// Metadata associated with a signature (signer, algorithm, optional attributes).
class SignatureMetadata {
  const SignatureMetadata({
    required this.signerId,
    required this.algorithm,
    this.attributes = const {},
  });

  final String signerId;
  final String algorithm;
  final Map<String, String> attributes;
}
