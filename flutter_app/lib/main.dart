// Phase 11.1.1 — Entry point. No decision logic. Technical init only.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_routes.dart';
import 'package:iris_flutter_app/presentation/navigation/iris_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IrisApp());
}

/// MaterialApp with deterministic routing. No domain logic.
class IrisApp extends StatelessWidget {
  const IrisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'IRIS',
      debugShowCheckedModeBanner: false,
      theme: IrisThemeData.fromMode(IrisVisualMode.defaultMode),
      initialRoute: IrisRoutes.home,
      onGenerateRoute: IrisRouter.onGenerateRoute,
    );
  }
}
