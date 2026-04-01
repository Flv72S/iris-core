// Phase 11.1.2 — Spacing & layout grid. Fixed scale; no dynamic runtime spacing.

abstract final class IrisSpacing {
  IrisSpacing._();

  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;

  /// Grid base unit. All spacing derived from this.
  static const double gridUnit = 4.0;
}
