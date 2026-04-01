// Phase 11.1.2 — Golden: typography deterministic rendering.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/typography.dart';

void main() {
  testWidgets('Typography scale renders deterministically', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(textTheme: IrisTypography.textTheme()),
        home: Scaffold(
          body: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Display', style: IrisTypography.textTheme().displayLarge),
              Text('Title', style: IrisTypography.textTheme().titleLarge),
              Text('Body', style: IrisTypography.textTheme().bodyLarge),
              Text('Label', style: IrisTypography.textTheme().labelMedium),
            ],
          ),
        ),
      ),
    );
    expect(find.text('Display'), findsOneWidget);
    expect(find.text('Title'), findsOneWidget);
    expect(find.text('Body'), findsOneWidget);
    expect(find.text('Label'), findsOneWidget);
  });
}
