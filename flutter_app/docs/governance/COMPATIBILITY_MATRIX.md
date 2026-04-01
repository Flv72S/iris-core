# IRIS Compatibility Matrix

Explicit compatibility between Core, Flow, and Plugin. No implicit compatibility.

## Core to Flow

- Core MAJOR X compatible with Flow MAJOR Y (explicit range).
- Example: Core 1.x with Flow 1.x. Core 1.x not with Flow 2.x.
- Bidirectional declared; absence of entry means incompatible.

## Flow to Plugin

- Plugin must declare supported Flow version range.
- No plugin compatible by default.
- Absence of entry means incompatible.

## General

- Compatibility is explicit; no fallback, no inference.
- Absence of entry means incompatible.
