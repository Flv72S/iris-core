// Phase 13.6 — Seal computation. Pure SHA-256; no IO, no RNG, no timestamp.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'freeze_seal.dart';

/// Payload separator. Fixed; no whitespace.
const String _payloadSeparator = '|';

/// Computes the freeze seal from version, structural hash, and previous seal.
/// payload = freezeVersion + "|" + structuralHash + "|" + previousSeal
/// sealHash = SHA-256(UTF-8(payload))
FreezeSeal computeFreezeSeal({
  required String freezeVersion,
  required String structuralHash,
  required String previousSeal,
}) {
  final payload = freezeVersion + _payloadSeparator + structuralHash + _payloadSeparator + previousSeal;
  final bytes = utf8.encode(payload);
  final digest = sha256.convert(bytes);
  final sealHash = digest.toString();
  return FreezeSeal(
    freezeVersion: freezeVersion,
    structuralHash: structuralHash,
    previousSeal: previousSeal,
    sealHash: sealHash,
  );
}
