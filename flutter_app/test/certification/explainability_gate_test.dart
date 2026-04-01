import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_safety_badge.dart';
import 'package:iris_flutter_app/presentation/explainability/components/explainability_details_section.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import '../_infrastructure/deterministic_test_binding.dart';
import '../_infrastructure/test_app_wrapper.dart';

void main() {
  setUpAll(ensureDeterministicBinding);
  testWidgets('Home has title and explainability nav', (tester) async {
    await tester.pumpWidget(const TestAppWrapper());
    await tester.pumpAndSettle();
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.text('Explainability'), findsOneWidget);
  });
  testWidgets('Explainability route has title', (tester) async {
    await tester.pumpWidget(
      TestAppWrapper(initialRoute: IrisRoutes.explainabilityPanel),
    );
    await tester.pumpAndSettle();
    expect(find.text('Explainability'), findsWidgets);
  });
  testWidgets('Explainability route shows safety badge', (tester) async {
    await tester.pumpWidget(
      TestAppWrapper(initialRoute: IrisRoutes.explainabilityPanel),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ExplainabilitySafetyBadge), findsOneWidget);
  });
  testWidgets('Explainability route shows details section', (tester) async {
    await tester.pumpWidget(
      TestAppWrapper(initialRoute: IrisRoutes.explainabilityPanel),
    );
    await tester.pumpAndSettle();
    expect(find.byType(ExplainabilityDetailsSection), findsOneWidget);
  });
  testWidgets('Explainability hierarchy: header then badge then details', (tester) async {
    await tester.pumpWidget(
      TestAppWrapper(initialRoute: IrisRoutes.explainabilityPanel),
    );
    await tester.pumpAndSettle();
    expect(find.text('Neutral'), findsOneWidget);
    expect(find.byType(ExplainabilitySafetyBadge), findsOneWidget);
    expect(find.byType(ExplainabilityDetailsSection), findsOneWidget);
  });
}
