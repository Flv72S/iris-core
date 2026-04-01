import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../../_infrastructure/test_app_wrapper.dart';

Future<void> pumpDeterministicScreen(WidgetTester tester, Widget widget) async {
  await tester.pumpWidget(widget);
  await tester.pumpAndSettle(const Duration(seconds: 10));
}

Future<void> pumpDeterministicRoute(WidgetTester tester, {String initialRoute = 'home'}) async {
  await tester.pumpWidget(TestAppWrapper(initialRoute: initialRoute));
  await tester.pumpAndSettle(const Duration(seconds: 10));
}

Future<void> expectGolden(WidgetTester tester, String path) async {
  await expectLater(tester, matchesGoldenFile(path));
}
