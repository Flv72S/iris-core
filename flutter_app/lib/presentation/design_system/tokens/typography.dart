// Phase 11.1.2 — Typography tokens. Deterministic, no autoscaling.

import 'package:flutter/material.dart';

/// Fixed typographic scale. Cross-platform stable metrics.
/// Line-heights and sizes are fixed; no runtime scaling.
abstract final class IrisTypography {
  IrisTypography._();

  static const String _fontFamily = 'Roboto';

  static const double fontSizeDisplay = 32.0;
  static const double fontSizeTitle = 24.0;
  static const double fontSizeHeadline = 20.0;
  static const double fontSizeBody = 16.0;
  static const double fontSizeCaption = 14.0;
  static const double fontSizeLabel = 12.0;

  static const double lineHeightTight = 1.2;
  static const double lineHeightNormal = 1.4;
  static const double lineHeightRelaxed = 1.5;

  static TextTheme textTheme() {
    return TextTheme(
      displayLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeDisplay,
        height: lineHeightTight,
        fontWeight: FontWeight.w600,
      ),
      titleLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeTitle,
        height: lineHeightNormal,
        fontWeight: FontWeight.w600,
      ),
      titleMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeHeadline,
        height: lineHeightNormal,
        fontWeight: FontWeight.w500,
      ),
      bodyLarge: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeBody,
        height: lineHeightRelaxed,
        fontWeight: FontWeight.normal,
      ),
      bodyMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeBody,
        height: lineHeightNormal,
        fontWeight: FontWeight.normal,
      ),
      bodySmall: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeCaption,
        height: lineHeightNormal,
        fontWeight: FontWeight.normal,
      ),
      labelMedium: TextStyle(
        fontFamily: _fontFamily,
        fontSize: fontSizeLabel,
        height: lineHeightNormal,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}
