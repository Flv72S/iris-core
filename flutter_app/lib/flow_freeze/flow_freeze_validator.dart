// F9 — Freeze validator. Detects breaking changes; does not block build.

import 'flow_compatibility_manifest.dart';

/// Result of comparing current vs baseline manifest. Explicit signal only.
class FlowFreezeValidationResult {
  const FlowFreezeValidationResult({
    required this.isCompatible,
    required this.breakingChanges,
  });

  final bool isCompatible;
  final List<String> breakingChanges;

  static const FlowFreezeValidationResult compatible =
      FlowFreezeValidationResult(isCompatible: true, breakingChanges: []);

  static FlowFreezeValidationResult breaking(List<String> changes) =>
      FlowFreezeValidationResult(isCompatible: false, breakingChanges: changes);
}

/// Compares current manifest to baseline. Detects structural breaking changes.
class FlowFreezeValidator {
  FlowFreezeValidator._();

  /// Compare current to baseline. Returns result with breaking changes list if any.
  static FlowFreezeValidationResult compare(
    FlowCompatibilityManifest current,
    FlowCompatibilityManifest baseline,
  ) {
    final changes = <String>[];
    if (current.behavioralHash != baseline.behavioralHash) {
      changes.add('behavioralHash');
    }
    if (current.stepGraphSignature != baseline.stepGraphSignature) {
      changes.add('stepGraph');
    }
    if (current.policySignature != baseline.policySignature) {
      changes.add('policy');
    }
    if (current.bindingSignature != baseline.bindingSignature) {
      changes.add('binding');
    }
    if (current.eventModelSignature != baseline.eventModelSignature) {
      changes.add('eventModel');
    }
    if (changes.isEmpty) {
      return FlowFreezeValidationResult.compatible;
    }
    return FlowFreezeValidationResult.breaking(changes);
  }
}
