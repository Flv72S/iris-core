// Microstep 12.7 — Global forbidden-claim guard. Compile-time + test; no runtime logic.

/// Lista chiusa di termini proibiti (claim normativi, conformità, certificazione).
/// Ordinata alfabeticamente; immutabile.
const List<String> kForbiddenCertificationTerms = [
  'ai act compliant',
  'approved',
  'certified',
  'compliance achieved',
  'compliant',
  'conformity achieved',
  'eu ai act compliant',
  'legally valid',
  'meets regulation',
  'meets requirements',
  'officially certified',
  'regulation satisfied',
];

/// Percorsi relativi (da root progetto) da scansionare per termini proibiti.
/// Solo modulo certification_status; nessun core IRIS, build, librerie esterne.
const List<String> kCertificationGuardPaths = [
  'lib/ui/certification_status',
];

/// Contenitore dichiarativo: espone termini e path. Nessuna IO, nessuna scansione runtime.
final class ForbiddenClaimGuard {
  ForbiddenClaimGuard._();

  static List<String> forbiddenTerms() =>
      List<String>.unmodifiable(kForbiddenCertificationTerms);

  static List<String> guardedPaths() =>
      List<String>.unmodifiable(kCertificationGuardPaths);
}
