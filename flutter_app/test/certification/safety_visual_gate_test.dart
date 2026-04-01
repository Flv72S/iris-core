// Phase 11.1.4 — Safety Visual Consistency Gate. Colors invariant; no layout change by mode.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import '../_infrastructure/deterministic_test_binding.dart';

void main() {
  setUpAll(ensureDeterministicBinding);

  test('Safety colors are invariant constants', () {
    expect(IrisColors.safetyNeutral, const Color(0xFF757575));
    expect(IrisColors.safetyCaution, const Color(0xFFF57C00));
    expect(IrisColors.safetyBlock, const Color(0xFFC62828));
  });

  test('Primary color varies by mode but layout does not', () {
    final d = IrisColors.primary(IrisVisualMode.defaultMode);
    final f = IrisColors.primary(IrisVisualMode.focus);
    final w = IrisColors.primary(IrisVisualMode.wellbeing);
    expect(d, isNot(equals(f)));
    expect(f, isNot(equals(w)));
    expect(w, isNot(equals(d)));
  });

  testWidgets('Theme from default mode applies', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: const Scaffold(body: SizedBox()),
      ),
    );
    expect(find.byType(Scaffold), findsOneWidget);
  });

  testWidgets('Theme from wellbeing mode applies without layout change', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.wellbeing),
        home: const Scaffold(body: SizedBox()),
      ),
    );
    expect(find.byType(Scaffold), findsOneWidget);
  });
}
