// F9 — Compatibility seal. Technical seal only.

import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'flow_compatibility_manifest.dart';

/// Seal hash binding manifest and Core compatibility. Deterministic.
class FlowCompatibilitySeal {
  FlowCompatibilitySeal._();

  static String _sealInput(FlowCompatibilityManifest manifest) {
    final ts = manifest.freezeTimestamp.epochMillis;
    return 'H=${manifest.behavioralHash}\n'
        'C=${manifest.coreCompatibilityVersion}\n'
        'V=${manifest.flowVersion}\n'
        'S=${manifest.stepGraphSignature}\n'
        'P=${manifest.policySignature}\n'
        'B=${manifest.bindingSignature}\n'
        'E=${manifest.eventModelSignature}\n'
        'T=$ts';
  }

  static String sealHash(FlowCompatibilityManifest manifest) {
    final input = _sealInput(manifest);
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
