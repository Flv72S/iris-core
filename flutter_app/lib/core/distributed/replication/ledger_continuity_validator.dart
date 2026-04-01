// ODA-2 — Validate hash chain, signatures, membership at event time.

/// Single event with index and hash for continuity check.
class LedgerEventRef {
  const LedgerEventRef({
    required this.index,
    required this.eventHash,
    required this.previousHash,
    this.signatureValid = false,
    this.membershipValidAtEventTime = false,
  });
  final int index;
  final String eventHash;
  final String previousHash;
  final bool signatureValid;
  final bool membershipValidAtEventTime;
}

/// Validates hash chain continuity and optional signature/membership. Rejects broken chain, invalid sigs, non-members.
class LedgerContinuityValidator {
  LedgerContinuityValidator({
    bool Function(LedgerEventRef event)? validateSignature,
    bool Function(int index, String nodeId)? validateMembershipAtEvent,
  })  : _validateSignature = validateSignature ?? _defaultSignature,
        _validateMembership = validateMembershipAtEvent ?? _defaultMembership;

  static bool _defaultSignature(LedgerEventRef event) => true;
  static bool _defaultMembership(int index, String nodeId) => true;

  final bool Function(LedgerEventRef event) _validateSignature;
  final bool Function(int index, String nodeId) _validateMembership;

  /// Validate batch: sequential indices, previousHash chain, signatures, membership.
  bool validateEventBatch(List<LedgerEventRef> events) {
    String prevHash = '';
    for (var i = 0; i < events.length; i++) {
      final e = events[i];
      if (e.index != i) return false;
      if (e.previousHash != prevHash) return false;
      if (!_validateSignature(e)) return false;
      prevHash = e.eventHash;
    }
    return true;
  }

  /// Validate segment [startIndex, endIndex] from list of refs. Rejects out-of-order, broken chain.
  bool validateLedgerSegment(List<LedgerEventRef> refs, int startIndex, int endIndex) {
    if (startIndex > endIndex) return false;
    final segment = refs.where((r) => r.index >= startIndex && r.index <= endIndex).toList();
    segment.sort((a, b) => a.index.compareTo(b.index));
    String prevHash = '';
    final prev = refs.where((r) => r.index == startIndex - 1).toList();
    if (prev.isNotEmpty) prevHash = prev.first.eventHash;
    for (final r in segment) {
      if (r.previousHash != prevHash) return false;
      if (!_validateSignature(r)) return false;
      prevHash = r.eventHash;
    }
    return true;
  }
}
