// Phase 11.1.2 — Color tokens. Mode-aware, no decorative semantic color.
// Mapping: mode → palette; safety signals explicit.

import 'package:flutter/material.dart';

/// IRIS product mode. Visual only; no decision logic.
enum IrisVisualMode {
  defaultMode,
  focus,
  wellbeing,
}

/// Deterministic palettes per mode. Accessible contrast; safety explicit.
abstract final class IrisColors {
  IrisColors._();

  // ---------- DEFAULT ----------
  static const Color defaultPrimary = Color(0xFF1976D2);
  static const Color defaultSurface = Color(0xFFFFFFFF);
  static const Color defaultOnSurface = Color(0xFF1A1A1A);
  static const Color defaultOutline = Color(0xFF757575);

  // ---------- FOCUS ----------
  static const Color focusPrimary = Color(0xFF0D47A1);
  static const Color focusSurface = Color(0xFFFAFAFA);
  static const Color focusOnSurface = Color(0xFF1A1A1A);
  static const Color focusOutline = Color(0xFF616161);

  // ---------- WELLBEING ----------
  static const Color wellbeingPrimary = Color(0xFF2E7D32);
  static const Color wellbeingSurface = Color(0xFFFFFFFF);
  static const Color wellbeingOnSurface = Color(0xFF1A1A1A);
  static const Color wellbeingOutline = Color(0xFF558B2F);

  // ---------- Safety (explicit, same meaning across modes) ----------
  static const Color safetyNeutral = Color(0xFF757575);
  static const Color safetyCaution = Color(0xFFF57C00);
  static const Color safetyBlock = Color(0xFFC62828);

  /// Primary for mode. No layout change; color only.
  static Color primary(IrisVisualMode mode) {
    switch (mode) {
      case IrisVisualMode.defaultMode:
        return defaultPrimary;
      case IrisVisualMode.focus:
        return focusPrimary;
      case IrisVisualMode.wellbeing:
        return wellbeingPrimary;
    }
  }

  static Color surface(IrisVisualMode mode) {
    switch (mode) {
      case IrisVisualMode.defaultMode:
        return defaultSurface;
      case IrisVisualMode.focus:
        return focusSurface;
      case IrisVisualMode.wellbeing:
        return wellbeingSurface;
    }
  }

  static Color onSurface(IrisVisualMode mode) {
    switch (mode) {
      case IrisVisualMode.defaultMode:
        return defaultOnSurface;
      case IrisVisualMode.focus:
        return focusOnSurface;
      case IrisVisualMode.wellbeing:
        return wellbeingOnSurface;
    }
  }

  static Color outline(IrisVisualMode mode) {
    switch (mode) {
      case IrisVisualMode.defaultMode:
        return defaultOutline;
      case IrisVisualMode.focus:
        return focusOutline;
      case IrisVisualMode.wellbeing:
        return wellbeingOutline;
    }
  }
}
