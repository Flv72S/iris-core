// OX7 — Before ledger append: sign canonical payload, verify, then commit. No unsigned event.

import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/crypto/signature_engine.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';
import 'package:iris_flutter_app/core/ui/intent_dispatcher.dart';
import 'package:iris_flutter_app/core/ui/intent_validator.dart';
import 'package:iris_flutter_app/core/ui/ui_intent.dart';

/// Converts valid intent into event payload. Called after validation, before signing.
typedef IntentToEvent = Map<String, dynamic>? Function(UIIntent intent);

/// Dispatches intents: validate → intentToEvent → sign → verify → onValidIntent(signed envelope).
/// Rejects if signature invalid. No unsigned domain event is passed to the sink.
class SignedIntentDispatcher {
  SignedIntentDispatcher({
    required IntentValidator validator,
    required SignatureEngine signatureEngine,
    required SignatureVerifier signatureVerifier,
    required String identityId,
    required void Function(Map<String, dynamic> signedEnvelope) onValidIntent,
    IntentToEvent? intentToEvent,
  })  : _validator = validator,
        _signatureEngine = signatureEngine,
        _signatureVerifier = signatureVerifier,
        _identityId = identityId,
        _onValidIntent = onValidIntent,
        _intentToEvent = intentToEvent;

  final IntentValidator _validator;
  final SignatureEngine _signatureEngine;
  final SignatureVerifier _signatureVerifier;
  final String _identityId;
  final void Function(Map<String, dynamic> signedEnvelope) _onValidIntent;
  final IntentToEvent? _intentToEvent;

  /// Validates [intent], converts to event payload, signs it, verifies, then calls [onValidIntent] with signed envelope.
  /// Throws if validation fails or signature verification fails. Payload must not be mutated.
  Future<void> dispatch(UIIntent intent, ValidationContext context) async {
    final result = _validator.validate(intent, context);
    if (!result.valid) {
      throw IntentRejectedException(result.message);
    }
    final payload = _intentToEvent?.call(intent);
    if (payload == null) return;

    final eventId = 'ev_${CanonicalPayload.hash(payload).substring(0, 16)}';
    final signed = await _signatureEngine.sign(
      payload: payload,
      identityId: _identityId,
      eventId: eventId,
    );
    final ok = await _signatureVerifier.verify(signed);
    if (!ok) {
      throw IntentRejectedException('Signature verification failed');
    }

    final envelope = <String, dynamic>{
      ...payload,
      '_eventId': signed.eventId,
      '_identityId': signed.identityId,
      '_publicKey': signed.publicKey,
      '_signature': signed.signature,
    };
    _onValidIntent(envelope);
  }
}
