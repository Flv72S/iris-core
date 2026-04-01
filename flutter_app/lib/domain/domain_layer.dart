// Phase 11.1.1 — DOMAIN LAYER (UI-only)
//
// Allowed: ViewModels, read-only UI entities, visual orchestration use cases.
// Pure Dart, no Flutter. Deterministic, no side-effects, semantically neutral vs core.
//
// Dependency: domain → bridge only. Never → infra directly, never → presentation.
