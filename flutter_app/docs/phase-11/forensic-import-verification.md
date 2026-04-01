# Phase 11.6.2 - Forensic Import and Verification

## Trust boundary

The importer does not trust the producer. Any .irisbundle.json can be tampered, truncated, or reordered. The verification pipeline is hash-first and fail-fast: UTF-8 decode, JSON parse, schema check, hash verification, record validation, replay verification. Only after all steps pass is a VerifiedForensicBundle returned.

## Threat model

- **Tampering:** One or more bytes changed. Detected by hash verification (HashMismatchException).
- **Truncation:** File cut. Typically leads to invalid JSON or invalid schema (InvalidBundleFormatException) or invalid records (InvalidRecordException).
- **Reordering:** Records reordered. Changes canonical content and thus hash (HashMismatchException). Replay would also diverge if metadata were left unchanged.
- **Schema violation:** Valid JSON but missing or wrong fields. Detected by schema validation and fromJson (InvalidBundleFormatException).
- **Replay mismatch:** Records valid but bundle metadata (sessionId, exportedAtLogicalTime) does not match the state produced by rehydration. Detected by verifyReplay (ReplayMismatchException).

## Technical vs semantic verification

- **Technical:** UTF-8, JSON, schema, hash, record structure and trace validation. Ensures the file is well-formed and internally consistent.
- **Replay verification** ensures that the declared metadata (sessionId, logical time) matches the state that would be produced by applying the records in order. This prevents a bundle that passes hash (e.g. with forged metadata) from being accepted when the metadata does not match the actual replayed state.

## Components

- **ForensicBundleImporter:** importAndVerify(Uint8List bytes). Parses UTF-8 and JSON, builds ForensicBundle, runs verifyHash, verifySchema, verifyRecords, verifyReplay. Returns VerifiedForensicBundle only if all pass; otherwise throws.
- **VerifiedForensicBundle:** Immutable DTO: bundle, verifiedHash, recordCount, sessionId, finalTimeContext, finalStoreHash. Created only by the importer after full verification.
- **ForensicBundleVerifier:** verifyHash(bundle), verifySchema(bundle), verifyRecords(bundle), verifyReplay(bundle). Pure, deterministic, no side effects. Explicit exceptions: HashMismatchException, InvalidBundleFormatException, InvalidRecordException, ReplayMismatchException.
- **forensic_import_exceptions.dart:** InvalidBundleFormatException, HashMismatchException, InvalidRecordException, ReplayMismatchException. Deterministic, audit-friendly messages.
