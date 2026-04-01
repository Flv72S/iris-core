# Phase 11.1.1 — Flutter Bootstrap Architecture

## Clean Architecture

| Layer | Direction | Content | Forbidden |
|-------|-----------|---------|-----------|
| presentation | to domain | Widgets, UI state, navigation | Business logic, core IRIS |
| domain | to bridge | ViewModels, read-only entities | Flutter in domain, side-effects |
| bridge | to infra | DTO, Intent, sync with core | Semantic transform, policy |
| infra | — | HTTP/storage stubs, config | Decision logic, safety |

Rule: presentation → domain → bridge → infra. No bypass.

## Execution Protocol Phase 11

Microstep 11.1.1 is the first certificable UI code. Layers respect Certification Gates. No client logic alters core Outcome; projection and Intent dispatch only.

## Client logic prohibitions

Forbidden: policy, safety rules, explainability generation, inference. Allowed: deterministic rendering, DTO→ViewModel read-only, Intent dispatch to core.

## Structure

flutter_app/lib: main.dart, presentation/, domain/, bridge/, infra/. test/. pubspec.yaml, analysis_options.yaml.
