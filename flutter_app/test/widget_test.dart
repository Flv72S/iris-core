// Phase 11.1.1 — Placeholder test. Certification: deterministic.

import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/main.dart';

void main() {
  testWidgets('App mounts and shows title', (WidgetTester tester) async {
    await tester.pumpWidget(const IrisApp());
    expect(find.text('IRIS'), findsOneWidget);
  });
}
