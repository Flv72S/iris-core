// J5 — Result of reading raw record for verification.

/// Result of fetching raw record content (no modification of files).
sealed class GetRawResult {
  const GetRawResult();
}

/// File does not exist.
final class GetRawMissing extends GetRawResult {
  const GetRawMissing();
}

/// File exists but format invalid or HASH header missing.
final class GetRawCorrupted extends GetRawResult {
  const GetRawCorrupted();
}

/// Successfully read; [hashFromContent] from header, [canonicalBody] after delimiter.
final class GetRawSuccess extends GetRawResult {
  const GetRawSuccess({
    required this.hashFromContent,
    required this.canonicalBody,
  });
  final String hashFromContent;
  final String canonicalBody;
}
