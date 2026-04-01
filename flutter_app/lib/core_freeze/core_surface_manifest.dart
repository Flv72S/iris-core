// Phase 13.1 — Core surface manifest. Pure data; no runtime logic.

/// Single entry in the core surface manifest.
class CoreSurfaceEntry {
  const CoreSurfaceEntry({
    required this.path,
    required this.type,
  });

  final String path;
  final String type;
}

/// Ordered list of core surfaces. Closed world; no dynamic discovery.
class CoreSurfaceManifest {
  const CoreSurfaceManifest(this.entries);

  final List<CoreSurfaceEntry> entries;
}
