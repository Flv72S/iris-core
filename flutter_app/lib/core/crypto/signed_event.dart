// OX7 — Signed event structure. Payload canonicalized before signing; identity-bound.

/// Event extended with signature. Payload must have been canonicalized before signing.
/// identityId must match publicKey (via deterministic identity derivation).
/// signature covers canonical payload hash only; no signature/dynamic/timestamp in signed content.
class SignedEvent {
  const SignedEvent({
    required this.eventId,
    required this.payload,
    required this.identityId,
    required this.publicKey,
    required this.signature,
  });

  final String eventId;
  final Map<String, dynamic> payload;
  final String identityId;
  final String publicKey;
  final String signature;
}
