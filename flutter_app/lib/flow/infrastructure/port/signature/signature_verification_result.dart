// K7 — Signature verification result. No implementation; value type only.

/// Result of verifying a signature.
class SignatureVerificationResult {
  const SignatureVerificationResult.valid()
      : valid = true,
        failureReason = null;

  const SignatureVerificationResult.invalid(this.failureReason)
      : valid = false;

  final bool valid;
  final String? failureReason;
}
