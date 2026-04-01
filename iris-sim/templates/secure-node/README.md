# IRIS Secure Node

Uses **IrisBuilder** to turn on **encryption** in the SDK (zero-config defaults, plus encryption feature).

## Run

```bash
node --experimental-strip-types index.ts
```

Or compile with TypeScript / use `tsx`.

## What to expect

- `node:ready` with encryption initialized in the SDK pipeline
- A short demo send after startup; payload is encrypted on the wire when encryption is enabled

See `iris.config.json` in the project root for transport and feature flags.
