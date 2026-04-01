// F9 - Same manifest yields same seal hash.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/flow_freeze/flow_compatibility_manifest.dart';
import 'package:iris_flutter_app/flow_freeze/flow_compatibility_seal.dart';
import 'package:iris_flutter_app/flow_runtime/flow_runtime_models.dart';

void main() {
  test('same manifest produces same seal hash', () {
    const manifest = FlowCompatibilityManifest(
      flowVersion: '1.0.0',
      behavioralHash: 'bh',
      coreCompatibilityVersion: '1.0',
      stepGraphSignature: 'sg',
      policySignature: 'ps',
      bindingSignature: 'bs',
      eventModelSignature: 'em',
      freezeTimestamp: FlowTimestamp(2000),
    );
    final seal1 = FlowCompatibilitySeal.sealHash(manifest);
    final seal2 = FlowCompatibilitySeal.sealHash(manifest);
    expect(seal1, seal2);
    expect(seal1.length, 64);
  });
}
