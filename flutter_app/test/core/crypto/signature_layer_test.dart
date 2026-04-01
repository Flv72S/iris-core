// OX7 — Tests: canonical hash, deterministic signature, verification, replay, deactivation.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/core/crypto/canonical_payload.dart';
import 'package:iris_flutter_app/core/crypto/key_store.dart';
import 'package:iris_flutter_app/core/crypto/signed_event.dart';
import 'package:iris_flutter_app/core/crypto/signature_engine.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';
import 'package:iris_flutter_app/core/crypto/signature_projection.dart';
import 'package:iris_flutter_app/core/identity/identity_model.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';
import 'package:iris_flutter_app/core/crypto/agreement_signature_helper.dart';
import 'package:iris_flutter_app/core/domain/primitives/agreement_primitive.dart';

void main() {
  group('OX7 CanonicalPayload', () {
    test('same payload produces same hash', () {
      final p = {'a': 1, 'b': 'x', 'c': true};
      final h1 = CanonicalPayload.hash(p);
      final h2 = CanonicalPayload.hash(p);
      expect(h1, h2);
      expect(h1.length, 64); // SHA-256 hex
    });

    test('different payload produces different hash', () {
      final h1 = CanonicalPayload.hash({'a': 1});
      final h2 = CanonicalPayload.hash({'a': 2});
      expect(h1, isNot(h2));
    });

    test('key order does not affect hash (canonical)', () {
      final p1 = {'z': 1, 'a': 2};
      final p2 = {'a': 2, 'z': 1};
      expect(CanonicalPayload.hash(p1), CanonicalPayload.hash(p2));
    });
  });

  group('OX7 SignatureEngine + SignatureVerifier', () {
    late InMemoryKeyStore keyStore;
    late String identityId;
    late String publicKeyB64;

    setUp(() async {
      keyStore = InMemoryKeyStore();
      final result = await keyStore.generateKeyPair();
      publicKeyB64 = result.publicKeyBase64;
      identityId = deterministicIdentityId(publicKeyB64);
      await keyStore.storeKey(identityId, result.seed);
    });

    test('sign then verify succeeds', () async {
      final engine = SignatureEngine(keyStore);
      final payload = {'eventType': 'TEST', 'objectId': 'o1', 'version': 1};
      final eventId = 'ev_${CanonicalPayload.hash(payload).substring(0, 8)}';
      final signed = await engine.sign(payload: payload, identityId: identityId, eventId: eventId);
      expect(signed.identityId, identityId);
      expect(signed.publicKey, publicKeyB64);
      expect(signed.signature.isNotEmpty, isTrue);

      final verifier = SignatureVerifier();
      final ok = await verifier.verify(signed);
      expect(ok, isTrue);
    });

    test('same key + payload produces same signature (deterministic)', () async {
      final engine = SignatureEngine(keyStore);
      final payload = {'x': 1, 'y': 2};
      final eventId = 'e1';
      final s1 = await engine.sign(payload: payload, identityId: identityId, eventId: eventId);
      final s2 = await engine.sign(payload: payload, identityId: identityId, eventId: eventId);
      expect(s1.signature, s2.signature);
    });

    test('tampered payload fails verification', () async {
      final engine = SignatureEngine(keyStore);
      final payload = {'eventType': 'TEST', 'v': 1};
      final signed = await engine.sign(payload: payload, identityId: identityId, eventId: 'e1');
      final tampered = SignedEvent(
        eventId: signed.eventId,
        payload: {'eventType': 'TEST', 'v': 2},
        identityId: signed.identityId,
        publicKey: signed.publicKey,
        signature: signed.signature,
      );
      final verifier = SignatureVerifier();
      final ok = await verifier.verify(tampered);
      expect(ok, isFalse);
    });

    test('deactivated identity fails verification', () async {
      final engine = SignatureEngine(keyStore);
      final payload = {'eventType': 'TEST'};
      final signed = await engine.sign(payload: payload, identityId: identityId, eventId: 'e1');
      final identityState = IdentityState(identities: {
        identityId: Identity(
          id: identityId,
          publicKey: publicKeyB64,
          displayName: 'U',
          roles: [],
          version: 1,
          isActive: false,
          createdAtHeight: 1,
          deactivatedAtHeight: 10,
        ),
      }, deviceBindings: const []);
      final verifier = SignatureVerifier(identityState: identityState);
      final ok = await verifier.verify(signed);
      expect(ok, isFalse);
    });

    test('active identity passes verification', () async {
      final engine = SignatureEngine(keyStore);
      final payload = {'eventType': 'TEST'};
      final signed = await engine.sign(payload: payload, identityId: identityId, eventId: 'e1');
      final identityState = IdentityState(identities: {
        identityId: Identity(
          id: identityId,
          publicKey: publicKeyB64,
          displayName: 'U',
          roles: [],
          version: 1,
          isActive: true,
          createdAtHeight: 1,
          deactivatedAtHeight: null,
        ),
      }, deviceBindings: const []);
      final verifier = SignatureVerifier(identityState: identityState);
      final ok = await verifier.verify(signed);
      expect(ok, isTrue);
    });
  });

  group('OX7 SignatureProjection', () {
    test('revalidate records valid event', () async {
      final keyStore = InMemoryKeyStore();
      final result = await keyStore.generateKeyPair();
      final identityId = deterministicIdentityId(result.publicKeyBase64);
      await keyStore.storeKey(identityId, result.seed);

      final engine = SignatureEngine(keyStore);
      final payload = {'e': 1};
      final signed = await engine.sign(payload: payload, identityId: identityId, eventId: 'ev1');

      final identityState = IdentityState(identities: {
        identityId: Identity(id: identityId, publicKey: result.publicKeyBase64, displayName: 'U', roles: [], version: 1, isActive: true, createdAtHeight: 1, deactivatedAtHeight: null),
      }, deviceBindings: const []);
      final verifier = SignatureVerifier(identityState: identityState);
      final projection = SignatureProjection(verifier: verifier);

      await projection.revalidate(signed);
      expect(projection.isEventValid('ev1'), isTrue);
      expect(projection.getInvalidEvents().contains('ev1'), isFalse);
    });

    test('revalidateAll after fork updates validity', () async {
      final keyStore = InMemoryKeyStore();
      final result = await keyStore.generateKeyPair();
      final identityId = deterministicIdentityId(result.publicKeyBase64);
      await keyStore.storeKey(identityId, result.seed);

      final engine = SignatureEngine(keyStore);
      final signed = await engine.sign(payload: {'e': 1}, identityId: identityId, eventId: 'ev1');

      final activeState = IdentityState(identities: {
        identityId: Identity(id: identityId, publicKey: result.publicKeyBase64, displayName: 'U', roles: [], version: 1, isActive: true, createdAtHeight: 1, deactivatedAtHeight: null),
      }, deviceBindings: const []);
      final deactivatedState = IdentityState(identities: {
        identityId: Identity(id: identityId, publicKey: result.publicKeyBase64, displayName: 'U', roles: [], version: 1, isActive: false, createdAtHeight: 1, deactivatedAtHeight: 5),
      }, deviceBindings: const []);

      final verifier = SignatureVerifier(identityState: activeState);
      final projection = SignatureProjection(verifier: verifier);
      await projection.revalidate(signed);
      expect(projection.isEventValid('ev1'), isTrue);

      await projection.revalidateAll(deactivatedState);
      expect(projection.isEventValid('ev1'), isFalse);
      expect(projection.getInvalidEvents().contains('ev1'), isTrue);
    });
  });

  group('OX7 Agreement verified threshold', () {
    test('countVerifiedAgreementSignatures only counts valid signatures', () async {
      final keyStore = InMemoryKeyStore();
      final result = await keyStore.generateKeyPair();
      final identityId = deterministicIdentityId(result.publicKeyBase64);
      await keyStore.storeKey(identityId, result.seed);

      final engine = SignatureEngine(keyStore);
      final payload = {'eventType': 'AGREEMENT_SIGNED', 'objectId': 'ag1', 'version': 1, 'nodeId': identityId};
      final signed = await engine.sign(payload: payload, identityId: identityId, eventId: 'ev_ag1');
      final identityState = IdentityState(identities: {
        identityId: Identity(id: identityId, publicKey: result.publicKeyBase64, displayName: 'U', roles: [], version: 1, isActive: true, createdAtHeight: 1, deactivatedAtHeight: null),
      }, deviceBindings: const []);
      final verifier = SignatureVerifier(identityState: identityState);

      final agreement = AgreementPrimitive(
        id: 'ag1',
        type: AgreementPrimitive.agreementType,
        version: 1,
        createdAtHeight: 1,
        updatedAtHeight: 1,
        isDeleted: false,
        participants: [identityId],
        signatures: {identityId: signed.signature},
        isFinalized: false,
      );
      final signedPayloadByNodeId = {identityId: payload};
      final count = await countVerifiedAgreementSignatures(
        agreement: agreement,
        identityState: identityState,
        verifier: verifier,
        signedPayloadByNodeId: signedPayloadByNodeId,
      );
      expect(count, 1);
      final meets = await agreementMeetsVerifiedThreshold(
        agreement: agreement,
        identityState: identityState,
        verifier: verifier,
        signedPayloadByNodeId: signedPayloadByNodeId,
        threshold: 1,
      );
      expect(meets, isTrue);
    });
  });
}
