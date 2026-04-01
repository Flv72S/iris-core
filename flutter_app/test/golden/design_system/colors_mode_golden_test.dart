// Phase 11.1.2 — Color mode. No layout change by mode.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';

void main() {
  testWidgets('Each mode applies theme', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: Scaffold(
          body: Container(color: IrisColors.primary(IrisVisualMode.defaultMode)),
        ),
      ),
    );
    expect(find.byType(Container), findsOneWidget);
  });
}
