// OX7 — Agreement: finalization threshold using verified signatures only.

import 'package:iris_flutter_app/core/crypto/signed_event.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';
import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';

/// Returns the number of signatures in [agreement] that verify against the signed payloads.
/// [signedPayloadByNodeId] maps participant nodeId (identityId) to the canonical payload that was signed.
/// Invalid signature, deactivated identity, or revoked device do not count.
Future<int> countVerifiedAgreementSignatures({
  required AgreementPrimitive agreement,
  required IdentityState identityState,
  required SignatureVerifier verifier,
  required Map<String, Map<String, dynamic>> signedPayloadByNodeId,
}) async {
  int count = 0;
  for (final nodeId in agreement.signatures.keys) {
    final signature = agreement.signatures[nodeId];
    final payload = signedPayloadByNodeId[nodeId];
    if (signature == null || payload == null) continue;
    final identity = identityState.getIdentity(nodeId);
    if (identity == null || !identity.isActive) continue;
    final signedEvent = SignedEvent(
      eventId: '${agreement.id}_$nodeId',
      payload: payload,
      identityId: nodeId,
      publicKey: identity.publicKey,
      signature: signature,
    );
    final ok = await verifier.verify(signedEvent);
    if (ok) count++;
  }
  return count;
}

/// Returns true if the agreement has at least [threshold] verified signatures.
Future<bool> agreementMeetsVerifiedThreshold({
  required AgreementPrimitive agreement,
  required IdentityState identityState,
  required SignatureVerifier verifier,
  required Map<String, Map<String, dynamic>> signedPayloadByNodeId,
  required int threshold,
}) async {
  final count = await countVerifiedAgreementSignatures(
    agreement: agreement,
    identityState: identityState,
    verifier: verifier,
    signedPayloadByNodeId: signedPayloadByNodeId,
  );
  return AgreementPrimitive.meetsThreshold(count, threshold);
}
