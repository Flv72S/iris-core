# IRIS Governance — Extension & Plugin Governance

Rules for optional extensions and plugins. Plugins never touch Core; they integrate only through declared surfaces and explicit compatibility.

---

## What is an IRIS plugin

A **plugin** is an **optional extension** that:

- Is **not required** for base system operation
- Can be **disabled without side effects**
- Declares **compatibility** with Flow and Core versions
- Operates only within **allowed scopes** and **integration surfaces**

---

## Allowed scopes

| Scope | Description |
|-------|-------------|
| FLOW_EXTENSIONS | Extends Flow behaviour (steps, transitions, hooks). |
| UX_EXTENSIONS | Extends UI/UX (widgets, themes, dashboards). |
| TELEMETRY_EXTENSIONS | Extends observability (metrics, logs, traces). |

**CORE is explicitly excluded.** No plugin scope grants Core modification or direct Core access.

---

## Integration surfaces

Plugins may integrate only through:

- **Public Flow API** (declared steps, transitions, event hooks)
- **Declared event hooks** (subscribe/publish on named events)
- **Read-only context** (no mutation of Core or Flow internals)

No internal APIs, no reflection into Core, no bypass of governance.

---

## Lifecycle

| Phase | Description |
|-------|--------------|
| install | Plugin artifact registered; not active. |
| activate | Plugin enabled; may use integration surfaces. |
| deactivate | Plugin disabled; revocable without breaking system. |
| remove | Plugin unregistered; no residual dependency. |

Plugins are always **revocable**; the system remains consistent after deactivate/remove.

---

## Required descriptor fields

| Field | Required | Description |
|-------|----------|-------------|
| pluginId | Yes | Unique identifier (non-empty). |
| pluginVersion | Yes | Semantic version of the plugin. |
| scope | Yes | One of flowExtension, uxExtension, telemetryExtension. |
| compatibleFlowVersions | Yes | Version range of supported Flow. |
| compatibleCoreVersions | Yes | Version range of supported Core. |
| description | Yes | Human-readable description (non-empty). |

---

## Contract (right of integration)

- **Allowed per scope**: see [Plugin Contract](/lib/governance/plugin/plugin_contract.dart) for surfaces and limits per scope.
- **Forbidden**: Core modification, inverse dependencies (Flow → Core), breaking changes to the system, undeclared compatibility.
- **Enforcement**: PluginValidator and compatibility checks in CI; no plugin without declared compatibility or with illegal scope.

---

*Document version: 1.0.*
