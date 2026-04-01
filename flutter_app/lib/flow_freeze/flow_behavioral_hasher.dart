// F9 - Behavioral hasher. Deterministic SHA-256.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'flow_interface_snapshot.dart';

class FlowBehavioralHasher {
  FlowBehavioralHasher._();

  static String canonicalString(FlowInterfaceSnapshot snapshot) {
    return 'S=${snapshot.stepGraphSignature}\n'
        'P=${snapshot.progressionSignature}\n'
        'R=${snapshot.policySignature}\n'
        'B=${snapshot.bindingSignature}\n'
        'E=${snapshot.eventModelSignature}';
  }

  static String behavioralHash(FlowInterfaceSnapshot snapshot) {
    final canonical = canonicalString(snapshot);
    final bytes = utf8.encode(canonical);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
