import 'package:flutter_test/flutter_test.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import 'package:iris_flutter_app/presentation/screens/history_screen.dart';
import 'package:iris_flutter_app/presentation/screens/home_screen.dart';
import 'package:iris_flutter_app/presentation/screens/settings_mode_screen.dart';
import '../_infrastructure/deterministic_test_binding.dart';
import '../_infrastructure/test_app_wrapper.dart';

void main() {
  setUpAll(ensureDeterministicBinding);

  testWidgets('All registered routes are reachable', (tester) async {
    for (final route in IrisRoutes.all) {
      await tester.pumpWidget(TestAppWrapper(initialRoute: route));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('Home route shows HomeScreen', (tester) async {
    await tester.pumpWidget(const TestAppWrapper());
    await tester.pumpAndSettle();
    expect(find.byType(HomeScreen), findsOneWidget);
  });

  testWidgets('History route shows HistoryScreen', (tester) async {
    await tester.pumpWidget(
      TestAppWrapper(initialRoute: IrisRoutes.history),
    );
    await tester.pumpAndSettle();
    expect(find.byType(HistoryScreen), findsOneWidget);
  });

  testWidgets('SettingsMode route shows SettingsModeScreen', (tester) async {
    await tester.pumpWidget(
      TestAppWrapper(initialRoute: IrisRoutes.settingsMode),
    );
    await tester.pumpAndSettle();
    expect(find.byType(SettingsModeScreen), findsOneWidget);
  });

  test('No anonymous routes', () {
    expect(IrisRoutes.all.contains(IrisRoutes.home), true);
    expect(IrisRoutes.all.length, 5);
  });

  testWidgets('Route names are stable', (tester) async {
    expect(IrisRoutes.home, 'home');
    expect(IrisRoutes.decisionDetail, 'decisionDetail');
    expect(IrisRoutes.explainabilityPanel, 'explainabilityPanel');
    expect(IrisRoutes.history, 'history');
    expect(IrisRoutes.settingsMode, 'settingsMode');
  });
}
