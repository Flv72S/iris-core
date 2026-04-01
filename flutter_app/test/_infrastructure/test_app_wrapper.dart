// Phase 11.1.4 — Single wrapper: MaterialApp + router + design system. No runtime logic.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_router.dart';
import 'golden_test_config.dart';

/// Wraps app with deterministic theme and router. Use for all certification tests.
class TestAppWrapper extends StatelessWidget {
  const TestAppWrapper({
    super.key,
    this.initialRoute = IrisRoutes.home,
    this.arguments,
  });

  final String initialRoute;
  final Object? arguments;

  @override
  Widget build(BuildContext context) {
    return TickerMode(
      enabled: false,
      child: MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          title: 'IRIS Test',
          debugShowCheckedModeBanner: false,
          theme: goldenDefaultTheme,
          initialRoute: initialRoute,
          onGenerateRoute: IrisRouter.onGenerateRoute,
        ),
      ),
    );
  }
}

/// Wrapper with custom initial route and optional arguments (for Navigator.pushNamed simulation).
class TestAppWrapperWithRoute extends StatelessWidget {
  const TestAppWrapperWithRoute({
    super.key,
    required this.initialRoute,
    this.arguments,
  });

  final String initialRoute;
  final Object? arguments;

  @override
  Widget build(BuildContext context) {
    return TickerMode(
      enabled: false,
      child: MediaQuery(
        data: MediaQueryData(
          size: kGoldenSurfaceSize,
          devicePixelRatio: 2.0,
          textScaler: TextScaler.linear(1.0),
        ),
        child: MaterialApp(
          title: 'IRIS Test',
          debugShowCheckedModeBanner: false,
          theme: goldenDefaultTheme,
          initialRoute: initialRoute,
          onGenerateRoute: IrisRouter.onGenerateRoute,
        ),
      ),
    );
  }
}
