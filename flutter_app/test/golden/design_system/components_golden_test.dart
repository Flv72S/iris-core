// Phase 11.1.2 — Component primitives golden.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_button.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_card.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_section.dart';
import 'package:iris_flutter_app/presentation/design_system/components/iris_text.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';

void main() {
  testWidgets('IrisText renders', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: const Scaffold(body: IrisText('Explainability')),
      ),
    );
    expect(find.text('Explainability'), findsOneWidget);
  });

  testWidgets('IrisButton renders', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: const Scaffold(body: IrisButton(label: 'Action')),
      ),
    );
    expect(find.text('Action'), findsOneWidget);
  });

  testWidgets('IrisCard and IrisSection render', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
        home: Scaffold(
          body: IrisSection(
            title: 'Section',
            child: IrisCard(child: IrisText('Body')),
          ),
        ),
      ),
    );
    expect(find.text('Section'), findsOneWidget);
    expect(find.text('Body'), findsOneWidget);
  });
}
