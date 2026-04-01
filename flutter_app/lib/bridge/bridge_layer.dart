// Phase 11.1.1 / 11.2.1 / 11.2.2 — BRIDGE LAYER
//
// Allowed: DTO mapping, intent channel, deterministic hash, versioned contract.
// Forbidden: Semantic transformation, decision logic, policy, implicit defaults.
//
// Structure: bridge/dto/, bridge/intents/, bridge/channel/, bridge/contracts/, bridge/mappers/, bridge/validation/, bridge/replay_store/.
// Read-only toward Core. Intent channel + trace validation (structure, hash, contract). Idempotent, auditabile.
