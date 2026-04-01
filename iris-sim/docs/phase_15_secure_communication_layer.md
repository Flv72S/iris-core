# IRIS Protocol — Phase 15
## Secure Communication Layer

### Document status
This document summarizes the implementation of Phase 15 in the current IRIS codebase.
It focuses on the developer-facing integration points and the security model boundaries.
All statements are derived from the existing source code and tests in `src/network/`.

### Scope
This document covers the microsteps introduced in Phase 15:
15A — Secure Session Manager
15B — Message Envelope Standard
15C — Encryption Layer (implemented as 15C-H: authenticated handshake + HKDF + binding)
15D — Replay Protection (distributed replay sync)
15E — Transport Abstraction Layer + concrete transports:
15E.0 HTTP and InMemory (base TAL)
15E.1 gRPC transport plugin
15E.2 WebSocket / P2P transport plugin

### Non-goals
This document explicitly does NOT introduce or describe:
Protocol logic inside transports.
Transport discovery/gossip algorithms.
Transport QoS, congestion control, or advanced retry.
Cryptographic trust policy design (delegated to the Trust Layer modules).
Replay storage persistence optimization (this phase is implemented in memory).

---

## 2. Overview

### Phase 15 objective
Phase 15 provides a secure and deterministic communication pipeline between IRIS nodes.
It ensures that messages:
Are authenticated through trust and session binding.
Are protected with end-to-end encryption using ephemeral key exchange.
Are resistant to replay attacks locally and across nodes.
Are transported through a pluggable transport abstraction layer.

### Role inside the IRIS system
Phase 15 sits between:
The Trust Layer (Phase 14T) and its trust/signature primitives.
The Secure Session Manager (15A), which binds communication endpoints.
The Message Envelope (15B), which standardizes authenticated message metadata.
The Encryption Layer (15C), which protects message payloads at application boundaries.
The Replay Protection layer (15D), which ensures idempotency and replay resistance.
The Transport Abstraction Layer (15E), which carries serialized envelopes across networks.

### What Phase 15 enables at high level
Authenticated node-to-node message delivery with cryptographic binding.
End-to-end payload confidentiality and integrity for message payloads.
Deterministic validation behavior suitable for enterprise audits.
Global idempotency across nodes via distributed replay identifier sync.
Transport pluggability without embedding protocol logic.

---

## 3. Architecture Summary

### Layering model
The system is structured as a pipeline with strict separation of concerns.
Each layer has a single responsibility and does not implement protocol logic beyond its contract.

Recommended layering for message receive:
Transport (15E)
Deserialization and wire mapping into `TransportMessage`
Envelope decoding into `MessageEnvelope`
Decryption if the transport raw contains `EncryptedEnvelope`
Session and envelope validation (15B + 15A)
Replay protection check (15D) integrated inside the envelope validator
Business logic execution (outside Phase 15)

Recommended layering for message send:
Session established via Secure Session Manager (15A)
Business logic builds a `payload` object
Message envelope creation and signing (15B)
Compute `payload_hash` deterministically
Encryption of the envelope payload (15C)
Transport send of the encrypted envelope as `TransportMessage.raw`

### Principles
Separation of concerns
The transport layer is responsible only for transport mechanics.
It does not validate signatures, sessions, or replay identifiers.
It does not couple to trust engines, session managers, or replay stores.

Zero implicit trust transport
All transports treat received bytes as untrusted.
They only parse and forward to upper layers.
Upper layers enforce authentication, encryption correctness, and replay resistance.

Deterministic validation and serialization
All cryptographic scopes and message payload hashes use deterministic serialization.
This reduces ambiguity and prevents signature scope drift.

Append-only / immutability for security-critical data
The implementation uses frozen objects (`Object.freeze`) to reduce accidental mutation.
Replay stores never delete entries (append-only philosophy).

Network-aware idempotency
Replay identifiers are propagated across nodes through distributed sync.
Duplicate identifiers are rejected deterministically.

---

## 4. Microstep Breakdown

This section describes each microstep implemented in Phase 15.
It focuses on lifecycle, responsibilities, data structures, and the security hardening implemented in code.

---

## 15A — Secure Session Manager

### What it is
`SessionManager` implements a deterministic handshake and session lifecycle.
It binds communication endpoints (local node and remote node) into a session object.
It leverages the Trust Layer to validate signatures and federation eligibility.

### Session lifecycle in this codebase
The session lifecycle is established by a challenge-response handshake.
The key APIs are:
`initiateHandshake(node_id_remote)` for the initiator (local -> remote)
`handleInit(init)` for the responder side
`handleChallenge(challenge)` for the initiator side
`finalizeHandshake(response)` for the responder side to create the session

The `finalizeHandshake` path creates a new `Session` record and stores it in `SessionRegistry`.
The session record includes:
`session_id`
`node_id_local`
`node_id_remote`
`public_key_remote`
Optional `key_id_remote`
Creation and expiry timestamps
`last_activity_at`
`status` in `{ active, expired, revoked }`

### Deterministic handshake mechanism
`SessionHandshake` creates handshake messages using:
A random `nonce` (UUID) in INIT.
A deterministic `challenge` derived from init fields using SHA-256.
A signed deterministic “handshake record” payload in RESPONSE.

The RESPONSE record condition string deterministically embeds:
the challenge
remote node id
the nonce
and the timestamp

The signed envelope returned from the Trust Signer is validated using `TrustEngine.validate` during finalization.

### Session validation behavior
`SessionManager.validateSession(session_id)` enforces:
The session exists.
The session is not revoked.
The session timestamp does not violate max clock skew hardening.
The session is expired based on `expires_at`.
The session is idle-expired based on `idleTimeoutMs` and `last_activity_at`.
The remote key bound to the session is not revoked in the trust key registry.
Then it updates activity (`touch`) and returns the refreshed session.

Important details from implementation:
Clock drift hardening compares `last_activity_at` with `now + maxSkewMs`.
Idle timeout uses `now - last_activity_at > idleTimeoutMs` to expire the session.

### Security hardening checklist (mapped to code)
Anti-fixation and injection prevention
`SessionManager.assertNoSessionId()` forbids the `session_id` field from being injected into handshake messages.
This is enforced for:
`handleInit(init)`
`handleChallenge(challenge)`
`finalizeHandshake(response)`

Idle timeout
SessionManager has default `SESSION_IDLE_TIMEOUT_MS = 5 * 60_000`.
Validation expires sessions when they exceed idle timeout since last successful access.

Concurrency control
`SessionRegistry` enforces a cap `MAX_SESSIONS_PER_NODE = 5` for ACTIVE sessions per remote node.
During `create(session)` for sessions with `status === 'active'`, it revokes the oldest sessions if the cap is reached.
Revocation is represented by creating new frozen session snapshots with `status: 'revoked'`.

Clock drift
Handshake messages are validated for age based on `maxSkewMs`.
Specifically:
`SessionHandshake.challenge(init)` checks `age > maxSkewMs` for init timestamp.
`SessionHandshake.respond(challenge)` checks `age > maxSkewMs` for challenge timestamp.
`SessionManager.validateSession(session_id)` checks `last_activity_at > now + maxSkewMs`.

Handshake anti-replay within this module
`SessionHandshake` uses:
`usedNonces` set to detect handshake replay of INIT nonce and RESPONSE nonce.
`pendingChallenges` map keyed by init nonce to verify challenge binding.

Key binding non-revocation
Session validation checks that the remote trust registry key for the bound `key_id_remote` is not revoked.
If revoked, validation throws `SESSION_REVOKED`.

### Determinism and immutability
Handshakes produce deterministic challenge and deterministic record payload conditions.
Session records are frozen.

### Errors and failure semantics
Session-related error codes:
`INVALID_HANDSHAKE`
`UNTRUSTED_NODE`
`SIGNATURE_INVALID`
`SESSION_EXPIRED`
`SESSION_NOT_FOUND`
`SESSION_REVOKED`

These are thrown as `SessionError` objects.
Higher layers map session errors to their domain errors where needed.

### Developer integration notes
Ensure that handshake inputs are not polluted with a `session_id` field.
Always call `validateSession` before accepting envelope processing.
Use session managers consistently per node identity.
Keep session manager instance boundaries clear in application code.

---

## 15B — Message Envelope Standard

### What it is
The message envelope standard defines an authenticated, signed metadata wrapper plus a payload.
The types are in `message_envelope_types.ts`.
The main validator is `MessageEnvelopeValidator`.

### Envelope structure in code
`MessageEnvelope` includes:
`message_id` (UUID v4)
`session_id`
`sender_node_id`
`recipient_node_id`
`timestamp`
`nonce`
`payload` (unknown)
`payload_hash` (sha256 hex; deterministic serialization of payload)
`signature` (Trust Layer Ed25519 base64 signature)

The implementation uses deterministic serialization:
`serializeDeterministic(payload)` sorts keys and omits undefined keys.
`computePayloadHash(payload)` hashes the deterministic JSON.

### Envelope signing (sender side)
`MessageEnvelopeSigner.sign(input)`:
Validates `message_id` is UUID v4.
Validates `session_id`, `sender_node_id`, `recipient_node_id`.
Validates `timestamp` is finite.
Validates `nonce` is non-empty.
Computes `payload_hash = sha256(serializeDeterministic(payload))`.
Builds a Covenant record-like payload that encodes:
message_id, session_id, sender_node_id, recipient_node_id, timestamp, nonce, payload_hash
Signs the record with `TrustSigner.sign`.
Returns an immutable envelope with:
payload_hash and signature set.

### Envelope verification (receiver side)
`MessageEnvelopeVerifier.verify(envelope, keyIdHint?)`:
Validates envelope structure types and required fields.
Recomputes `payload_hash` and compares to envelope payload_hash.
Builds a verification record with:
message_id, session_id, sender_node_id, recipient_node_id, timestamp, nonce, payload_hash
Calls `trustEngine.validate` with:
record, signature, sender_node_id, signed_at, and optionally key_id.
Maps Trust Layer error codes into MessageEnvelopeError:
REPLAY_DETECTED -> MessageEnvelopeErrorCode.REPLAY_DETECTED
INVALID_SIGNATURE -> MessageEnvelopeErrorCode.INVALID_SIGNATURE
default -> INVALID_SIGNATURE

### Session binding validation in the envelope validator
`MessageEnvelopeValidator.validate(envelope)` calls:
`sessionManager.validateSession(envelope.session_id)`
Then enforces sender/recipient binding:
It interprets session binding as:
sender must be session.node_id_remote
recipient must be session.node_id_local
If not matching, it throws `SESSION_MISMATCH`.

Then it verifies signature:
If a TrustEngine verifier was provided, it calls
`verifier.verify(envelope, session.key_id_remote)`

### Replay protection integration in this code
The envelope validator integrates replay protection by calling:
`this.replay.processEnvelope(envelope)`
after session and signature checks.

If replay protection throws:
ReplayErrorCode.REPLAY_DETECTED
it maps into MessageEnvelopeErrorCode.REPLAY_DETECTED.
Other ReplayError values are mapped into MessageEnvelopeErrorCode.INVALID_STRUCTURE.

### Envelope errors in this codebase
`MessageEnvelopeErrorCode` includes:
`INVALID_STRUCTURE`
`INVALID_SIGNATURE`
`PAYLOAD_TAMPERED`
`INVALID_SESSION`
`SESSION_MISMATCH`
`REPLAY_DETECTED`

These are wrapped as `MessageEnvelopeError`.

### Developer integration notes
Call `MessageEnvelopeValidator.validate` after decryption.
Do not execute business logic before validation.
Ensure that your application supplies a correct `sessionManager` and `trustEngine` and (optionally) a configured `ReplayProtectionEngine`.

---

## 15C — Encryption Layer (15C-H)

### What it is
The encryption layer implements end-to-end encryption with:
Authenticated ephemeral key exchange (signed handshake via TrustEngine)
HKDF-based key derivation with session-bound salt and info binding
Strict session binding for cryptographic isolation
AES-256-GCM for confidentiality and integrity
Forward secrecy based on ephemeral X25519 keys

In this codebase it is labeled as 15C-H in the module header comments.

### Encryption session model
`EncryptionSession` includes:
`session_id`
`sender_node_id`
`recipient_node_id`
Local ephemeral private/public keys (base64)
Remote ephemeral public key (base64)
Shared secret (base64)
Derived `encryption_key` (base64; 32 bytes after HKDF)
`created_at`

Two direction-specific sessions are stored:
Local->Remote encryption key
Remote->Local encryption key

This ensures direction-correct usage of derived keys.

### Handshake for encryption session initialization
`EncryptionEngine.initializeEncryptionSession(session_id, remoteHandshake)`:
Validates the secure session using `sessionManager.validateSession(session_id)`.
Creates a verifier:
`AuthenticatedKeyExchangeHandshake(null, trustEngine)`
Then calls:
`verifier.verifyHandshake(remoteHandshake)`

Handshake verification:
`AuthenticatedKeyExchangeHandshake.verifyHandshake(signed)` calls:
`trustEngine.validate(signed)` to authenticate signature and trust record validity.
Parses the deterministic `condition` string from the signed record definition.
The condition is expected to be JSON with fields:
session_id, sender_node_id, recipient_node_id, ephemeral_public_key, timestamp

Session binding enforcement:
It checks payload.session_id equals the expected session_id.
It checks direction binding:
payload.sender_node_id must match `session.node_id_remote`
payload.recipient_node_id must match `session.node_id_local`

### Key exchange and key derivation
Ephemeral key exchange:
`KeyExchange.generateEphemeralKeyPair()` uses X25519.
`deriveSharedSecret(local.privateKey, payload.ephemeral_public_key)` uses `diffieHellman`.

HKDF:
`deriveKeys(shared_secret_buf, session_id, sender_node_id, recipient_node_id)`:
salt = SHA256(session_id) (32 bytes)
info = `IRIS::ENCRYPTION::${session_id}::${sender_node_id}::${recipient_node_id}`
output length = 32 bytes
Algorithm: HKDF-SHA256 implemented via RFC 5869-style HMAC blocks.

### Payload encryption and decryption
Encryption uses AES-256-GCM:
IV is randomly generated as 12 bytes.
Ciphertext includes no explicit tag; instead it returns:
ciphertext base64
iv base64
auth_tag base64

Decryption:
`decryptPayload(ciphertext, key, iv, auth_tag)` returns UTF-8 plaintext.
The decrypted plaintext is parsed as JSON.
Then the computed payload hash is compared to the envelope payload_hash.

### Envelope encryption behavior
`EncryptionEngine.encryptEnvelope(envelope)`:
Fetches an initialized encryption session context using:
session_id, envelope.sender_node_id, envelope.recipient_node_id.
It calls `getEncryptionSessionOrThrow` which validates secure session again.
Checks that `computePayloadHash(envelope.payload)` matches envelope.payload_hash.
Serializes payload deterministically:
`serializeDeterministic(envelope.payload)`
Encrypts plaintext using ctx.encryption_key.
Returns an immutable `EncryptedEnvelope` containing:
message_id, session_id, sender_node_id, recipient_node_id, timestamp, nonce
encrypted_payload, iv, auth_tag
payload_hash and signature fields carried forward.

`EncryptionEngine.decryptEnvelope(encrypted)`:
Fetches ctx based on:
encrypted.session_id, encrypted.sender_node_id, encrypted.recipient_node_id.
Decrypts and parses JSON.
Verifies payload_hash against encrypted.payload_hash.
Returns a MessageEnvelope-like object with payload and signature fields.

### Error codes
`EncryptionErrorCode` includes:
KEY_EXCHANGE_FAILED
ENCRYPTION_FAILED
DECRYPTION_FAILED
INVALID_AUTH_TAG
SESSION_NOT_FOUND
PAYLOAD_HASH_MISMATCH
INVALID_ENVELOPE
INVALID_HANDSHAKE
HANDSHAKE_VERIFICATION_FAILED
INVALID_HANDSHAKE_SIGNATURE
KEY_DERIVATION_FAILED
INVALID_SESSION_BINDING

Thrown as `EncryptionError`.

### Security properties derived from code
Authentication:
Encryption handshake authenticity is enforced by TrustEngine validation of signed record envelopes.

Integrity:
AES-256-GCM provides integrity via auth_tag.
Additional payload_hash verification checks deterministic hashing consistency after decrypt.

Confidentiality:
AES-GCM ciphertext protects payload serialized deterministically.

Forward secrecy:
Keys depend on ephemeral X25519 key exchange created per encryption session initialization.

Session-bound isolation:
HKDF info includes session_id and sender/recipient node ids.
Derived key differs per session and per direction.

Strict binding:
initializeEncryptionSession enforces handshake payload session_id and direction binding.

### Developer integration notes
Call initializeEncryptionSession once per session_id and per direction handshake payload you receive.
Use the returned direction context implicitly through envelope sender/recipient in encrypt/decrypt.
Ensure that your sender and receiver use consistent session binding:
envelope sender_node_id and recipient_node_id must match ctx direction.
Do not accept encrypted envelopes before initializing the encryption session, otherwise `INVALID_SESSION_BINDING` is thrown.

---

## 15D — Replay Protection (Distributed Replay Protection System)

### What it is
`ReplayProtectionEngine` provides deterministic replay detection and prevents duplicate message execution.
It integrates with MessageEnvelopeValidator.

### Replay identity model in this code
`ReplayIdentifier` is derived from `MessageEnvelope` fields:
message_id
nonce
session_id
sender_node_id
recipient_node_id
timestamp

Mapping function:
`replayIdentifierFromEnvelope(envelope)` reads:
envelope.message_id, envelope.nonce, envelope.session_id,
envelope.sender_node_id, envelope.recipient_node_id, envelope.timestamp.

### Duplicate detection rule implemented
The rule is implemented by `ReplayNonceStore`:
It maintains:
`byMessageId`: Map message_id -> ReplayIdentifier
`byNonce`: Map composite nonce key -> ReplayIdentifier
The composite nonce key includes:
session_id, sender_node_id, recipient_node_id, nonce

`has(identifier)` returns true if either:
the message_id was already seen and not expired
or the nonce key was already seen and not expired

This implements “message_id OR nonce uniqueness” as required.

### Timestamp validation implemented
`ReplayValidator.validate(identifier)` checks:
nonce presence and non-empty
identifier.timestamp within:
max_age_ms window (default 5 minutes)
max_drift_ms window for future skew (default 30 seconds)

If any condition fails:
throws `ReplayError` with code:
INVALID_TIMESTAMP or NONCE_MISSING.

### Nonce store semantics (deterministic and append-only)
`ReplayNonceStore`:
Has no delete operations.
`add(identifier)` is idempotent due to `has` guard.
It optionally enforces `max_entries` capacity.
It supports `ttl_ms` checks for duplicate detection behavior:
`has` ignores expired entries by returning false if expired.

Important operational detail:
The store does not remove expired entries from internal maps or orderedKeys.
It only changes behavior of `has` and therefore duplicate detection.
`getAll()` returns all ordered identifiers recorded, regardless of expiry.

### Replay engine behavior
`ReplayProtectionEngine.processEnvelope(envelope)`:
Extracts ReplayIdentifier
Validates via ReplayValidator (nonce, timestamp, duplicate detection)
Adds identifier to store
Optionally broadcasts identifier to the distributed distribution layer

Broadcast is performed only if a `ReplayDistributionEngine` was injected.

### Distributed replay sync integration (14R integration concept)
The distributed propagation mechanism is `ReplayDistributionEngine`.
It is designed to use a transport-like abstraction:
`ReplayDistributionTransport`:
`send(envelope)` and `onReceive(handler)`

Broadcast behavior:
Builds `ReplayDistributionEnvelope` containing:
node_id
identifiers array
timestamp
Then sends it via transport.

Incoming behavior:
Validates structure via `isReplayDistributionEnvelope` and `isReplayIdentifier`.
Validates `envelope.node_id` is non-empty.
Ensures sender_node_id inside each ReplayIdentifier equals the envelope node_id.
Then adds identifiers to the store with `store.add`.

Distributed engine behavior:
It does not call `ReplayValidator`.
It validates only structure and sender mapping.
Therefore, timestamp drift/age validation is performed only at the local `processEnvelope` stage (through ReplayValidator).

### Errors
`ReplayErrorCode`:
REPLAY_DETECTED
INVALID_TIMESTAMP
NONCE_MISSING
DISTRIBUTION_INVALID

Errors are thrown as `ReplayError`.
The MessageEnvelopeValidator maps them into MessageEnvelopeErrorCode values as described in 15B.

### Developer integration notes
To enable distributed replay sync:
Construct ReplayProtectionEngine with an injected `ReplayDistributionEngine`.
The distribution engine must be driven by:
`ReplayDistributionEngine.start()` or by wiring its transport `onReceive`.

To preserve determinism:
Use consistent `now` time source when testing.
For enterprise deployments:
ensure time synchronization across nodes to reduce false timestamp failures.

### Security model boundary
Replay protection does not validate trust signatures.
It relies on the envelope validator to validate session and signature.

---

## 15E — Transport Layer (Transport Abstraction Layer)

### Core objective
Phase 15E introduces the Transport Abstraction Layer (TAL).
Its purpose is to decouple IRIS protocol code from any particular network transport backend.
It allows multiple backends and testable implementations.

### Design contract
The transport contract is implemented by the `Transport` interface:
`send(message: TransportMessage): Promise<void>`
`onReceive(handler: (message: TransportMessage) => void): void`
Optional:
`start?(): Promise<void>`
`stop?(): Promise<void>`

Transport messages are generic:
They contain:
`raw: unknown`
`metadata`:
sender_node_id
recipient_node_id optional
timestamp
type optional

The transport interface does not depend on MessageEnvelope or encryption or replay.

### Transport Router
`TransportRouter` routes messages to handlers based on message type.
Type detection order is:
Prefer `message.metadata.type`
If missing, attempt to infer `raw.type`
Otherwise fallback to `default`

It supports:
`registerHandler(type, handler)`
`registerDefaultHandler(handler)`
`dispatch(message)`

No protocol logic is embedded here; it is purely routing.

### Transport Factory
`TransportFactory` provides:
`create({ type, options })`
It validates configuration and throws `TransportError` codes:
UNSUPPORTED_TRANSPORT for unknown types
INVALID_MESSAGE for invalid options

Supported transport types in this codebase:
http
inmemory
grpc (added via 15E.1 plugin)
ws (added via 15E.2 plugin)

### 15E.0 HTTP and InMemory transports
HTTP transport:
`HttpTransport` uses Node native `http`.
It exposes an endpoint:
POST `/iris/message`
Request body is JSON serialized `TransportMessage`.
Response is `OK` or `INVALID_MESSAGE` or `RECEIVE_FAILED`.

It validates message structure with `isTransportMessage`:
raw and metadata sender_node_id and timestamp types.

The receive handler calls:
`this.handler(rawTransportMessage)`
with no further protocol logic.

InMemory transport:
`InMemoryTransportBus` uses a map of node_id to transport instance.
`deliver(message)`:
If recipient_node_id is provided:
it delivers to that specific node.
Otherwise it broadcasts to all nodes except sender.

`InMemoryTransport.send` requires `start()` first.
It throws `TransportErrorCode.SEND_FAILED` if not started.

InMemory is deterministic and suitable for testing.

### 15E.1 gRPC Transport Plugin
The gRPC plugin is implemented under `src/network/transport_grpc/`.

gRPC proto schema
The `.proto` file defines:
TransportMessage:
sender, recipient, type, payload (JSON string), timestamp
IrisTransportService with SendMessage RPC
Ack with success bool

Server responsibilities
`startGrpcServer(config, onMessage)`:
Loads `.proto` via proto-loader at runtime.
Registers an untyped service implementation.
Validates:
sender present and non-empty
recipient present and non-empty
payload JSON parse succeeds when payload is non-empty string
timestamp is parseable to number
Then constructs `TransportMessage`:
raw = parsed payload object (or null)
metadata mapping:
sender_node_id from proto sender
recipient_node_id from proto recipient
timestamp number
type only if proto type is provided as string
Calls `onMessage(message)`

Client responsibilities
`sendGrpcMessage(address, message, options)`:
Loads proto definition and client constructor dynamically.
Serializes:
raw as JSON string (or empty string if raw is undefined/null)
Maps metadata sender_node_id/recipient_node_id/type/timestamp into proto fields.
Calls the gRPC unary method.
It rejects with `GrpcTransportErrorCode`:
CONNECTION_FAILED if err.code equals grpc.status.UNAVAILABLE
SEND_FAILED otherwise

Plugin transport wrapper
`GrpcTransport` implements `Transport`:
`start()` starts the gRPC server and wires `onReceive`.
`send()` resolves peer address from an internal map:
It requires message.metadata.recipient_node_id.
It throws CONNECTION_FAILED via GrpcTransportErrorCode on unknown peer.

Security boundary
The transport does not validate trust or sessions or replay.
It only validates the basic message structure and JSON payload parsing.

Operational limitations in this implementation
No TLS (insecure credentials only).
No automatic peer discovery.
Retry logic is not implemented.
No stream multiplexing is implemented; unary RPC only.

### 15E.2 WebSocket / P2P Transport Plugin
The WebSocket plugin is implemented under `src/network/transport_ws/`.

Core differences from HTTP/gRPC
WebSocket provides a persistent connection.
This plugin supports P2P semantics by allowing each node to be both:
server (accepting inbound websocket connections)
client (connecting to known peers)

Handshake / mapping mechanism
To associate a websocket socket with a node_id, the client connector sends:
A JSON wire frame with metadata:
type: '__peer_hello__'
sender: local_node_id
recipient: peer_node_id
timestamp: Date.now()

The server validates wire frames shape.
When it receives non-hello frames, it checks:
wire.metadata.sender is non-empty
and if wire.metadata.recipient is present it must match the local node_id.

Then it dispatches:
wire.raw is parsed as JSON (if parse fails, frame is ignored)
TransportMessage.raw is the parsed object
TransportMessage.metadata maps sender/recipient/timestamp and optional type
to the `Transport` handler.

Peer manager
`WsPeerManager` maintains:
peers registry (node_id -> WsPeer)
connections mapping (node_id -> WsConnection)

Client connector and reconnect
The client connector:
creates a WebSocket connection to peer.url
attaches open/message/close/error listeners
on open:
sends a hello frame
on close:
invokes onClose callback
optionally reconnects with exponential backoff (simple implementation)

The transport wrapper:
keeps a map of client handles by node_id
on stop:
closes client handles
terminates sockets
terminates server-side clients
then closes the server

Send and receive behavior
Send:
send(message) requires recipient_node_id
it awaits connection mapping (up to 1.2 seconds) via `awaitConnection`
then sends a JSON wire message on the websocket.

Receive:
inbound websocket frames are validated and dispatched to the handler set by `onReceive`.
Invalid JSON wire frames are ignored.

Security boundary
The WebSocket transport does not validate signatures, session validity, or replay identifiers.
It only validates wire structure and does JSON parsing.

Operational limitations in this implementation
No peer discovery beyond explicitly configured `peers`.
No broadcast/gossip and no automatic mesh formation.
Reconnect is basic and does not include retry budgeting or circuit breakers.

---

## 5. Security Model

### Responsibility boundaries
This section describes where each security property is enforced.

Authentication
Secure Session Manager (15A)
Handshake uses TrustSigner to sign deterministic records.
Finalization uses TrustEngine.validate to verify signed challenge binding.

Message authentication and integrity (envelope)
MessageEnvelopeSigner (15B) signs payload_hash and envelope metadata.
MessageEnvelopeVerifier (15B) recomputes payload_hash and verifies signature using TrustEngine.validate.

Encryption authentication and integrity (payload)
EncryptionEngine (15C) uses AES-256-GCM with random IV and auth_tag.
It also verifies payload_hash after decryption.

Replay resistance and idempotency
ReplayProtectionEngine (15D) uses ReplayValidator and ReplayNonceStore.
It checks nonce presence, timestamp drift and age, and duplicate detection.
Distributed replay sync optionally propagates identifiers across nodes.

Transport trust boundary
Transports (15E) never assume authenticity.
They parse and forward frames only.
No trust/session/replay logic is implemented inside transport modules.

### What transports explicitly do NOT do
Transports do not:
validate TrustEngine signatures
validate secure sessions
validate replay identifiers
enforce timestamp drift rules
encrypt or decrypt payloads

They may validate:
minimum JSON structure requirements (sender/recipient/timestamp presence)
payload JSON parse in some transports

---

## 6. Data Flow (Critical)

This section describes the pipeline in practical enterprise terms.
It is expressed as recommended integration steps that a real system should wire together.

### Receive pipeline (recommended)
Step 1: Transport receives bytes
HTTP handler receives POST body and decodes JSON into `TransportMessage`.
gRPC server receives proto `TransportMessage` and converts payload JSON string into `TransportMessage.raw`.
WebSocket server receives a JSON wire message and converts it into `TransportMessage`.

Step 2: Application decodes protocol payload
At this boundary, your application determines what is in `TransportMessage.raw`:
If `raw` is an encrypted envelope object, call `EncryptionEngine.decryptEnvelope`.
If `raw` is a plain message envelope object, you can skip decryption.

Step 3: Validate session and envelope signature (15B + 15A)
Call `MessageEnvelopeValidator.validate(envelope)`:
sessionManager.validateSession(envelope.session_id)
enforce sender/recipient binding to session
verify signature via MessageEnvelopeVerifier (if trustEngine was injected)

Step 4: Replay protection (15D)
MessageEnvelopeValidator calls `replay.processEnvelope(envelope)`:
ReplayValidator checks nonce, timestamp drift/age, and duplicates.
ReplayNonceStore appends identifier if valid.
ReplayDistributionEngine may broadcast the identifier if configured.

Step 5: Execute business logic
Only after validation and replay protection succeed, execute message handling.

### Send pipeline (recommended)
Step 1: Secure session handshake (15A)
Initiator calls:
sessionManager.initiateHandshake(remote)
responder calls:
sessionManager.handleInit
initiator calls:
sessionManager.handleChallenge
responder calls:
sessionManager.finalizeHandshake
This produces `Session` records bound to node endpoints.

Step 2: Prepare message envelope metadata (15B)
Sender creates a `payload` object and uses:
MessageEnvelopeSigner.sign()
This produces:
message_id, session_id, sender/recipient ids, timestamp, nonce, payload_hash, signature.

Step 3: Encryption session initialization (15C-H)
Before encrypting, the receiver must initialize its encryption session context.
However, in a typical enterprise flow the peers establish encryption contexts as part of their session coordination.
In the current code:
EncryptionEngine.initializeEncryptionSession(session_id, remoteHandshakeSigned)
produces a direction context stored in an internal map keyed by:
`session_id::sender_node_id::recipient_node_id`.

Step 4: Encrypt envelope payload (15C)
EncryptionEngine.encryptEnvelope(envelope)`:
Computes payload_hash match.
Encrypts deterministic serialization of envelope.payload using ctx.encryption_key.
Returns EncryptedEnvelope.

Step 5: Transport send (15E)
Application wraps EncryptedEnvelope (or MessageEnvelope) as `TransportMessage.raw`.
TransportMessage.metadata is set by the application:
sender_node_id = envelope.sender_node_id
recipient_node_id = envelope.recipient_node_id
timestamp = envelope.timestamp
type may be used by the app if desired.

Then:
`transport.send(transportMessage)` sends via the configured transport backend.

---

## 7. Design Principles

### Modularity
Each microstep can be configured and tested independently.
The core contract interfaces are:
SessionManager for session lifecycle and validation.
MessageEnvelopeValidator for envelope authentication and replay checks.
EncryptionEngine for encryption and decryption.
ReplayProtectionEngine for idempotency.
Transport interface for transport pluggability.

### Pluggable transports
Transports implement `Transport` with a strict contract.
The transport router and factory allow modular integration.
No transport code references:
TrustEngine, SessionManager, ReplayProtectionEngine, or EncryptionEngine.

### Deterministic behavior
Message envelope hashing and handshake record conditions rely on deterministic serialization.
Replay validation behavior relies on deterministic drift/age checks given a stable time source.

### Append-only and immutability
Replay nonce store never deletes entries.
Sessions, envelopes, and handshake records are frozen objects.
This reduces shared-state risks and increases auditability.

### Zero implicit trust
Transport layers forward untrusted data.
All cryptographic validation happens in higher layers.

---

## 8. Enterprise Capabilities

### Secure node-to-node communication
SessionManager binds local and remote endpoints into a session with:
signature validation
expiry and idle timeout enforcement
revocation-aware key binding

### End-to-end confidentiality and integrity
EncryptionEngine protects payloads with:
AES-256-GCM
auth_tag verification
payload_hash verification

### Distributed idempotency
ReplayProtectionEngine ensures that duplicate identifiers:
are rejected deterministically
can be propagated across nodes through ReplayDistributionEngine
do not rely on client-side uniqueness

### Auditability and reproducibility
Deterministic serialization:
makes payload hashing stable
reduces scope ambiguity for signatures
enables consistent logs and forensic checks.

### Scalability characteristics
The replay store uses O(1) lookups due to Map-based indexing.
Transport remains pluggable, allowing scaling by changing transport backend.

---

## 9. Extensibility

### Adding a new transport backend
Implement the `Transport` interface:
send
onReceive
start/stop optional

The new transport must:
Accept `TransportMessage` and serialize its raw payload.
Call the registered handler for received messages.
Perform minimal structural validation only.
Avoid any protocol logic, trust validation, encryption, or replay validation.

Then register the new backend in `TransportFactory`:
Update the `type` union in `transport_types.ts`.
Add a case in `transport_factory.ts`.

Optionally provide a routing type mapping convention:
Set `TransportMessage.metadata.type` when sending.
Use `TransportRouter` to dispatch.

### Extending replay sync
In this codebase, replay distribution is optional and injected.
You can plug:
any transport-like object implementing ReplayDistributionTransport:
send(envelope) and onReceive(handler)

The replay distribution logic remains deterministic at the structure level.

### Extending encryption
Encryption is encapsulated in EncryptionEngine.
Key derivation uses deriveKeys (HKDF-SHA256).
Encryption payload uses AES-256-GCM.

To extend:
Introduce a new encryption engine variant or new cipher module.
Keep the same envelope contract and maintain payload_hash verification behavior.

---

## 10. Current Limitations

### Replay storage is in-memory only
ReplayNonceStore is in-memory.
The system does not persist replay identifiers across process restarts.
It does not implement pruning that removes entries from memory.

### Timestamp validation in distributed sync
ReplayValidator enforces timestamp drift/age only for local processEnvelope calls.
ReplayDistributionEngine incoming sync validates structure and sender mapping but does not apply ReplayValidator checks.
This is a deliberate separation in the current implementation.

### Transport security hardening
Transports validate minimal JSON structure.
They do not provide TLS by default:
HTTP has no TLS support in this module.
gRPC uses insecure credentials only.
WS relies on the underlying WebSocket configuration (this module does not add TLS wrappers).

### No peer discovery and no gossip
WS plugin relies on explicit configuration of peers.
No automatic discovery exists in this phase.
No gossip protocol is implemented.

### No advanced retry and no QoS
gRPC and HTTP transports are simple.
WS reconnect is basic with exponential backoff, but:
there is no circuit breaker,
no retry budgeting,
no message reordering guarantees beyond socket-level ordering.

### No congestion control
Transport layer does not implement QoS, congestion control, or backpressure negotiation.

### No transport-to-protocol coupling
This is a limitation in terms of features:
transports cannot optimize for protocol-specific semantics.
However it is required for the architectural constraints and for testability.

---

## 11. Future Directions

AI network layer integration
Implement higher-level coordination using pluggable transports:
Swarm messaging
Distributed execution coordination
Federation network scaling

Federation scaling and transport optimization
Implement transport discovery and dynamic peer registry (future step).
Add QoS and congestion control boundaries (future step).
Introduce stronger transport security:
TLS for HTTP and gRPC
Secure WebSocket configuration

Replay and state persistence improvements
Add persistent replay identifier storage with:
bounded retention
cryptographic integrity of stored state
process restart resilience

Replay sync validation improvements
Extend replay distribution to optionally run full ReplayValidator checks on incoming identifiers as an enterprise hardening option.

---

## 12. Conclusion

Phase 15 transforms IRIS into a secure distributed communication protocol.
It provides:
Deterministic session establishment and validation with clock drift and idle timeout hardening.
Authenticated message envelopes with deterministic payload hashing and trust-based signature validation.
End-to-end encryption with authenticated ephemeral X25519 handshake and HKDF session-bound keys.
Deterministic replay protection for idempotency, locally and across nodes via distributed replay sync.
A transport abstraction layer that is pluggable and decoupled from protocol logic, with HTTP, gRPC, and WebSocket/P2P implementations.

With this foundation, IRIS becomes suitable for enterprise deployment scenarios:
secure node-to-node message exchange
distributed systems coordination
auditable and reproducible security validation workflows
scalable transport backends without protocol changes

