# Microstep 14G — State Integrity Verification (Observer-Aware)

State is considered valid only if it has been accepted through consensus, matches the consensus result, and its history is consistent with observed consensus events.

## Usage

1. **Create a trace store** and attach the observer to your consensus coordinator so proposals, votes, and results are recorded:

```ts
import { ConsensusTraceStore, ConsensusTraceObserver } from './state_integrity/index.js';
import { getCoordinator } from './consensus/index.js'; // or your coordinator factory

const traceStore = new ConsensusTraceStore();
const observer = new ConsensusTraceObserver(traceStore);
const coordinator = getCoordinator(/* ... */);
coordinator.addObserver(observer);
```

2. **After applying a new network state**, verify integrity:

```ts
import { StateIntegrityEngine } from './state_integrity/index.js';

const report = StateIntegrityEngine.verify(currentState, traceStore);
if (!report.valid) {
  // Handle report.violations (MISSING_CONSENSUS, STATE_MISMATCH, INVALID_TRANSITION, etc.)
}
```

## Exports

- **Types:** `StateIntegrityReport`, `IntegrityViolation`, `IntegrityViolationType`, `ConsensusTrace`
- **Store:** `ConsensusTraceStore` — register proposal, votes, result; query traces
- **Observer:** `ConsensusTraceObserver` — implements `IConsensusObserver`, forwards events to a store
- **Validator:** `StateIntegrityValidator.validateState(state, traceStore)` → violations
- **Engine:** `StateIntegrityEngine.verify(state, traceStore)` → report (state_hash, valid, violations, checked_at)
- **Errors:** `IntegrityError`, `IntegrityErrorCode`
