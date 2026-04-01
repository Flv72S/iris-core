/// ⚠️ DETERMINISTIC CORE — NO ENTROPY ZONE
///
/// Centralized list of forbidden APIs for entropy audit and regression tests.
///
/// ## Deterministic core boundary
///
/// **Allowed:**
/// - Pure data structures
/// - Pure functions
/// - Canonical serialization
/// - Cryptographic hashing (deterministic only, e.g. FNV-1a)
/// - Immutable state
///
/// **Forbidden:**
/// - Time (DateTime.now, DateTime.utc, SystemClock, any clock)
/// - Randomness (Random(), Random.secure(), Uuid.v4())
/// - IO (dart:io in core)
/// - Network
/// - Platform inspection (Platform.environment, Platform.numberOfProcessors)
/// - Thread/Isolate inspection
/// - Locale-dependent formatting
/// - Async timers / Futures with timing dependency
class EntropySources {
  EntropySources._();

  /// Forbidden API patterns. Used by entropy scan test and documentation.
  static const List<String> forbiddenApis = [
    'DateTime.now',
    'DateTime.utc',
    'Random(',
    'Random.secure',
    'Uuid.v4',
    'Platform.environment',
    'Platform.numberOfProcessors',
    'SystemClock',
    'dart:io',
    'dart:math',
  ];

  /// Patterns used for file-content scan (string search).
  static const List<String> scanPatterns = [
    'DateTime.now',
    'DateTime.utc',
    'Random(',
    'Random.secure',
    'Uuid.v4',
    'Platform.',
    "import 'dart:io'",
    'import "dart:io"',
    "import 'dart:math'",
    'import "dart:math"',
  ];
}
