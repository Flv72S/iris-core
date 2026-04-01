// F9 - Compatibility manifest. Serializable.

import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

class FlowCompatibilityManifest {
  const FlowCompatibilityManifest({
    required this.flowVersion,
    required this.behavioralHash,
    required this.coreCompatibilityVersion,
    required this.stepGraphSignature,
    required this.policySignature,
    required this.bindingSignature,
    required this.eventModelSignature,
    required this.freezeTimestamp,
  });

  final String flowVersion;
  final String behavioralHash;
  final String coreCompatibilityVersion;
  final String stepGraphSignature;
  final String policySignature;
  final String bindingSignature;
  final String eventModelSignature;
  final FlowTimestamp freezeTimestamp;

  Map<String, Object> toJson() {
    return {
      'flowVersion': flowVersion,
      'behavioralHash': behavioralHash,
      'coreCompatibilityVersion': coreCompatibilityVersion,
      'stepGraphSignature': stepGraphSignature,
      'policySignature': policySignature,
      'bindingSignature': bindingSignature,
      'eventModelSignature': eventModelSignature,
      'freezeTimestampEpochMillis': freezeTimestamp.epochMillis,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FlowCompatibilityManifest &&
          flowVersion == other.flowVersion &&
          behavioralHash == other.behavioralHash &&
          coreCompatibilityVersion == other.coreCompatibilityVersion &&
          stepGraphSignature == other.stepGraphSignature &&
          policySignature == other.policySignature &&
          bindingSignature == other.bindingSignature &&
          eventModelSignature == other.eventModelSignature &&
          freezeTimestamp == other.freezeTimestamp);

  @override
  int get hashCode => Object.hash(
        flowVersion,
        behavioralHash,
        coreCompatibilityVersion,
        stepGraphSignature,
        policySignature,
        bindingSignature,
        eventModelSignature,
        freezeTimestamp,
      );
}
