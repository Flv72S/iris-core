# IRIS Messaging — Basic

Two small scripts that show the **send** and **receive** sides of the SDK.

The current `IrisNode` zero-config transport uses **loopback** on the same node: you send and receive on the same process. This is intentional for demos and local development.

## Run receiver

Terminal 1:

```bash
node --experimental-strip-types receiver.ts
```

## Run sender

Terminal 2:

```bash
node --experimental-strip-types sender.ts
```

You will see periodic `PING` sends on the sender and loopback receive logs; the receiver script logs only when it receives messages on its own node.

## Next steps

- Adjust `iris.config.json` (ports, transport) for your deployment.
- See **Hello World** and **Secure Node** templates for a single-file flow and encryption.
