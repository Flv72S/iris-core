# Dependency discipline (Phase 11.1.1)

- presentation → domain only. NEVER import infra or core IRIS.
- domain → bridge only. NEVER import infra directly or presentation.
- bridge → infra. Read-only toward core. Adapter-only.
- infra → no dependency on presentation or domain.

Violation = certification FAIL.
