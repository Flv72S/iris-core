import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/screens/home_screen.dart';
import '../_infrastructure/deterministic_test_binding.dart';
import '../_infrastructure/test_app_wrapper.dart';

void main() {
  setUpAll(ensureDeterministicBinding);
  testWidgets('same screen same structure', (tester) async {
    await tester.pumpWidget(const TestAppWrapper());
    await tester.pumpAndSettle();
    expect(find.byType(HomeScreen), findsOneWidget);
  });
  testWidgets('rebuilds identical', (tester) async {
    await tester.pumpWidget(const TestAppWrapper());
    await tester.pumpAndSettle();
    expect(find.text('IRIS'), findsOneWidget);
  });
  testWidgets('navigation back deterministic', (tester) async {
    await tester.pumpWidget(const TestAppWrapper());
    await tester.pumpAndSettle();
    await tester.tap(find.text('History'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Decision Detail'), findsOneWidget);
  });
}
