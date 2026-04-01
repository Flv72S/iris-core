// Phase 11.1.3 — Static route names. No dynamic generation.

abstract final class IrisRoutes {
  IrisRoutes._();

  static const String home = 'home';
  static const String decisionDetail = 'decisionDetail';
  static const String explainabilityPanel = 'explainabilityPanel';
  static const String history = 'history';
  static const String settingsMode = 'settingsMode';

  static const List<String> all = [
    home,
    decisionDetail,
    explainabilityPanel,
    history,
    settingsMode,
  ];
}
