// OX7 — Rebuild signature validity state. Fork: revalidate affected events.

import 'package:iris_flutter_app/core/crypto/signed_event.dart';
import 'package:iris_flutter_app/core/crypto/signature_verifier.dart';
import 'package:iris_flutter_app/core/identity/identity_projection.dart';

/// Tracks which events have valid signatures and which are invalid.
/// Integrates with IdentityProjection; on fork revalidate using updated identity state.
class SignatureProjection {
  SignatureProjection({required SignatureVerifier verifier}) : _verifier = verifier;

  final SignatureVerifier _verifier;

  final Set<String> _validEventIds = {};
  final Set<String> _invalidEventIds = {};
  final Map<String, SignedEvent> _eventsById = {};

  /// Whether [eventId] has been verified as valid (signed and identity/device ok).
  bool isEventValid(String eventId) => _validEventIds.contains(eventId);

  /// Event IDs that failed verification (tampered, deactivated identity, revoked device).
  Set<String> getInvalidEvents() => Set<String>.from(_invalidEventIds);

  /// Event IDs that passed verification.
  Set<String> getValidEvents() => Set<String>.from(_validEventIds);

  /// Updates validity state for [signedEvent]. Call when new signed event is applied.
  Future<void> revalidate(SignedEvent signedEvent, {String? deviceId}) async {
    final id = signedEvent.eventId;
    _eventsById[id] = signedEvent;
    final ok = await _verifier.verify(signedEvent, deviceId: deviceId);
    if (ok) {
      _validEventIds.add(id);
      _invalidEventIds.remove(id);
    } else {
      _invalidEventIds.add(id);
      _validEventIds.remove(id);
    }
  }

  /// Revalidates all known events with [identityState] (e.g. after fork). Updates valid/invalid sets.
  Future<void> revalidateAll(IdentityState identityState) async {
    final verifier = SignatureVerifier(identityState: identityState);
    for (final e in _eventsById.values) {
      final id = e.eventId;
      final ok = await verifier.verify(e);
      if (ok) {
        _validEventIds.add(id);
        _invalidEventIds.remove(id);
      } else {
        _invalidEventIds.add(id);
        _validEventIds.remove(id);
      }
    }
  }
}
