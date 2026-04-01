# Phase 8 — Certification & Replay Suite

## 1. Scopo della Phase 8 Certification

La **Phase 8 Certification Suite** dimostra formalmente che la Phase 8 (Feedback Loop Governance) è:

- **Deterministica** — stesso input → stesso output, senza clock/random/IO.
- **Replayable** — la pipeline può essere rieseguita con gli stessi input e produce output identico.
- **Isolata** — nessuna modifica al runtime Phase 7, nessuna scrittura su Signal Layer, preferenze o learning.
- **Auditabile** — ogni livello (Outcome log, Safety Evaluation, Checklist Verdict, Escalation, Attestation Snapshot) è serializzabile e certificabile.

La suite **non modifica** il runtime, **non introduce** logica di business, **non prende** decisioni operative. È **solo certificazione**.

---

## 2. Relazione con Phase 7 Certification

- **Phase 7** certifica il *runtime di esecuzione* e il *boundary* (Boundary Attestation 7.F): nessuna scrittura su Signal Layer, preferenze immutate, learning inattivo.
- **Phase 8** certifica il *Feedback Loop*: Outcome → Classification → Persistence → Safety Evaluation → Verdict → Escalation → Attestation Snapshot.
- Phase 8 **consuma** il report Phase 7 (Phase7BoundaryReport) come *tipo/contratto*; non invoca codice Phase 7. L’isolamento è preservato.

---

## 3. Differenza tra i componenti

| Componente | Ruolo |
|------------|--------|
| **Safety Checklist** (8.1 Safety) | Valida boundary report e metadati Phase 8; produce `fullySafe` e `failedChecks`. Certificazione tecnica, non guardrail. |
| **Escalation Bridge** (8.3) | Mappa `SafetyChecklistVerdict` (SAFE/WARNING/UNSAFE) in `BoundaryEscalationEvent` (NONE/OBSERVE/BLOCK_RECOMMENDED). Solo dichiarativo: Phase 8 dichiara *se* è richiesta escalation; Phase 7 decide *se e come* agire. |
| **Certification Suite** (questa) | Esegue la pipeline Phase 8 end-to-end, verifica determinismo e replay, produce `Phase8CertificationReport`. Dimostra che Phase 8 è deterministica, replayable e isolata. |

---

## 4. Significato di “Phase 8 Fully Certified”

`phase8FullyCertified === true` nel report significa che **tutti** i seguenti flag sono true:

- **determinismVerified** — N run identici della pipeline producono output identico.
- **replayVerified** — La riesecuzione con gli stessi input produce risultato identico all’esecuzione originale.
- **phase7IsolationVerified** — La suite non invoca runtime Phase 7; solo tipi/contratti.
- **boundaryEscalationDeclarative** — L’escalation è solo dichiarativa (livello di intento), non operativa.
- **learningAbsent** — Nessun apprendimento in Phase 8.

Quando tutti sono true, Phase 8 è ufficialmente **Fully Certified**: deterministica, replayable, isolata e auditabile end-to-end.
