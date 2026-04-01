# IRIS — Product Demo (Baseline)

## 1. Purpose

This demo is a read-only, deterministic visualization of the IRIS product state.  
It shows how system state, user experience and feature composition are exposed — not how decisions are made or actions executed.

- It **visualizes** system state.
- It **does not** take decisions.
- It **does not** execute actions.
- It **does not** simulate automations.

---

## 2. What This Demo Shows

- UX State Projection (C.6)
- Experience State Interpretation (C.6.5)
- Feature Pipelines (C.7)
- Feature Orchestration (C.8)
- Product Modes (C.9)
- UX Contract (frozen)
- Demo Scenarios (deterministic)

---

## 3. What This Demo Does NOT Do

- ❌ No real execution
- ❌ No decision-making
- ❌ No learning or adaptation
- ❌ No user interaction
- ❌ No prioritization logic in UI

---

## 4. Architecture at a Glance

```
IRIS Core / Messaging
        ↓
UX State Projection (C.6)
        ↓
Experience Interpretation (C.6.5)
        ↓
Feature Pipelines (C.7)
        ↓
Feature Orchestrator (C.8)
        ↓
UX Contract (frozen)
        ↓
Demo Scenarios (A2)
        ↓
React UI (read-only)
```

---

## 5. How to Use the Demo

1. **Select a scenario** — Use the Scenario dropdown to choose a deterministic scenario (e.g. Focus, Waiting, Blocked). This only changes the input data shown; it does not run any logic.
2. **Select a product mode** — Use the Product Mode control (DEFAULT, FOCUS, WELLBEING) to see how the same scenario is presented under different modes. Again, this only changes what is displayed.
3. **Read the three columns** — **System State (UX Projection)** shows the current UX states; **User Experience Summary** shows the interpreted experience (label, confidence, explanation); **Active Product Features** shows the orchestrated features with visibility, priority and mode.

**Nothing is clickable by design.** The UI is a projection of state only; no buttons or links perform actions beyond changing the selected scenario or mode for display purposes.

---

## 6. Status

**Status:** Product-grade demo baseline  
**Change policy:** No functional changes without explicit architectural decision.

---

## Change Guard

Any of the following requires a new architectural decision:

- adding UI behavior
- adding feature logic
- introducing adaptive behavior
- modifying UX Contract semantics

Visual polish and layout refinement are allowed.
