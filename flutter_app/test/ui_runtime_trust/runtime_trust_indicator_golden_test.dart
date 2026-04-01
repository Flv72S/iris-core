// Phase 11.8.2 — Golden: certified and uncertified indicator. Pixel-identical.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/ui/runtime_trust/runtime_trust_indicator.dart';
import 'package:iris_flutter_app/ui/runtime_trust/runtime_trust_state.dart';

import '../_infrastructure/golden_test_config.dart';

void main() {
  testWidgets('golden certified runtime indicator', (WidgetTester tester) async {
    const state = RuntimeTrustState(
      isCertified: true,
      compliancePackHash: 'a1b2c3d4e5f6789012345678',
      forensicBundleHash: 'f1f2f3f4f5f6',
      logicalTick: 42,
      sessionId: 'session-1',
    );
    await tester.pumpWidget(
      wrapWithGoldenMediaQuery(
        MaterialApp(
          theme: goldenDefaultTheme,
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(24.0),
              child: RuntimeTrustIndicator(state: state),
            ),
          ),
        ),
      ),
    );
    await expectLater(
      find.byType(RuntimeTrustIndicator),
      matchesGoldenFile('golden/runtime_trust_indicator_certified.png'),
    );
  });

  testWidgets('golden uncertified runtime indicator', (WidgetTester tester) async {
    const state = RuntimeTrustState(
      isCertified: false,
      compliancePackHash: '',
      forensicBundleHash: '',
      logicalTick: 0,
      sessionId: '',
    );
    await tester.pumpWidget(
      wrapWithGoldenMediaQuery(
        MaterialApp(
          theme: goldenDefaultTheme,
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(24.0),
              child: RuntimeTrustIndicator(state: state),
            ),
          ),
        ),
      ),
    );
    await expectLater(
      find.byType(RuntimeTrustIndicator),
      matchesGoldenFile('golden/runtime_trust_indicator_uncertified.png'),
    );
  });
}
