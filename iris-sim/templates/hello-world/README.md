# IRIS Hello World

Minimal zero-config example: start a node, send one message, receive it on the same node (loopback).

## Prerequisites

- Node.js 18+
- The `iris` package installed (e.g. `npm install iris` in your project, or use this repo)

## Start the IRIS runtime (optional)

In one terminal (from this project folder):

```bash
npx iris start
```

## Run the example

**Node.js 22+** (TypeScript strip types):

```bash
node --experimental-strip-types index.ts
```

Or compile with `tsc`, or use `npx tsx index.ts` if you have `tsx` installed.

## What you should see

- Node starting (`node:ready`)
- A message sent (`HELLO`)
- The same message received (`message` event)

This demonstrates the **IrisNode** API: events, `start()`, and `send()` with no extra configuration.
