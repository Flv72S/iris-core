# IRIS Flutter App

Phase 11.1.1 — Bootstrap. Clean Architecture, zero decision logic in client.

- **presentation** → **domain** → **bridge** → **infra**
- No business logic, no policy, no explainability generation in client.
- Deterministic rendering only; Intent dispatch toward core IRIS.
