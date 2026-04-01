// Phase 11.1.4 — Golden config. Fixed surface, default theme.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/theme/iris_theme.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';

const Size kGoldenSurfaceSize = Size(390, 844);

ThemeData get goldenDefaultTheme =>
    IrisThemeData.fromMode(IrisVisualMode.defaultMode);

Widget wrapWithGoldenMediaQuery(Widget child) {
  return MediaQuery(
    data: MediaQueryData(
      size: kGoldenSurfaceSize,
      devicePixelRatio: 2.0,
      textScaler: TextScaler.linear(1.0),
    ),
    child: child,
  );
}
