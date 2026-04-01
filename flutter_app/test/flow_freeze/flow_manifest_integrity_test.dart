// F9 - Manifest: required fields, stable serialization, no volatile fields.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_freeze/flow_compatibility_manifest.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

void main() {
  test('manifest has all required fields and stable toJson', () {
    const manifest = FlowCompatibilityManifest(
      flowVersion: '1.0.0',
      behavioralHash: 'abc123',
      coreCompatibilityVersion: '1.0',
      stepGraphSignature: 'S',
      policySignature: 'P',
      bindingSignature: 'B',
      eventModelSignature: 'E',
      freezeTimestamp: FlowTimestamp(1000),
    );
    final json = manifest.toJson();
    expect(json['flowVersion'], '1.0.0');
    expect(json['behavioralHash'], 'abc123');
    expect(json['coreCompatibilityVersion'], '1.0');
    expect(json['stepGraphSignature'], 'S');
    expect(json['policySignature'], 'P');
    expect(json['bindingSignature'], 'B');
    expect(json['eventModelSignature'], 'E');
    expect(json['freezeTimestampEpochMillis'], 1000);
    expect(json.length, 8);
  });

  test('serialization is deterministic', () {
    const manifest = FlowCompatibilityManifest(
      flowVersion: '1.0.0',
      behavioralHash: 'h',
      coreCompatibilityVersion: 'c',
      stepGraphSignature: 's',
      policySignature: 'p',
      bindingSignature: 'b',
      eventModelSignature: 'e',
      freezeTimestamp: FlowTimestamp(0),
    );
    final a = manifest.toJson().toString();
    final b = manifest.toJson().toString();
    expect(a, b);
  });
}
