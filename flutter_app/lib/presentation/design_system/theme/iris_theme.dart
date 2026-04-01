// Phase 11.1.2 — Theme from tokens only. No runtime logic. Reproducible per mode.

import 'package:flutter/material.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/colors.dart';
import 'package:iris_flutter_app/presentation/design_system/tokens/typography.dart';

/// Theme data derived only from design tokens. Deterministic.
class IrisThemeData {
  IrisThemeData._();

  static ThemeData fromMode(IrisVisualMode mode) {
    final primaryColor = IrisColors.primary(mode);
    final surfaceColor = IrisColors.surface(mode);
    final onSurfaceColor = IrisColors.onSurface(mode);
    final outlineColor = IrisColors.outline(mode);

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.light(
        primary: primaryColor,
        surface: surfaceColor,
        onSurface: onSurfaceColor,
        outline: outlineColor,
      ),
      textTheme: IrisTypography.textTheme(),
      // Spacing via app-level; no layout change by mode
    );
  }
}
