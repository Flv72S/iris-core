# PROMPT — Implementazione Microstep 8.2.3  
## Semantic Explanation & Suggestions Contract (No Authority)

**Prompt unico e completo per Cursor.**  
**Microstep:** 8.2.3 — Semantic Explanation & Suggestions Contract  
**Fase:** 8 — Semantic & Behavioral Layer

---

## Contesto vincolante

Il sistema si trova in **Fase 8**, con:

- Fase 7 base tecnica **immutabile, read-only e non interpretabile**
- Fase 8 come overlay **reversibile, disattivabile e auditabile**
- Microstep **8.2.0** (Semantic Engine Skeleton) COMPLETATO
- Microstep **8.2.1** (Semantic Aggregation Contract) COMPLETATO e CONGELATO
- Microstep **8.2.2** (Priority, Ranking & Weighting Model) COMPLETATO

Il presente microstep **8.2.3** è il **primo punto in cui viene introdotto uno strato esplicativo/suggerimenti**, ma:

- **NON** introduce decisioni
- **NON** introduce policy applicativa o enforcement
- **NON** modifica il dato Fase 7
- **NON** produce effetti autoritativi
- **NON** parla per conto della Fase 7

---

## Scopo del microstep 8.2.3 (VINCOLANTE)

Introdurre un **contratto esplicito e dichiarativo** per **spiegazioni e suggerimenti** semantici, con i seguenti obiettivi:

- Rendere **opzionale** e **revocabile** lo strato esplicativo (8.1.1: “Spiegazioni, reason, suggerimenti UX”)
- Consentire ai moduli semantici di **produrre** SemanticExplanation come **dato aggregabile** nello snapshot
- **NON** incorporare explanation nei Read Model Fase 7 (7.5)
- **NON** attribuire intenzionalità o “voce” alla Fase 7
- Rendere lo strato **disattivabile** (kill-switch) e **reversibile** (fallback a neutralità)

Le spiegazioni e i suggerimenti sono **descrittivi**, **NON** prescrittivi. **Nessuna autorità.**

---

## Riferimenti normativi obbligatori

- [8.0 — Phase Opening](./8.0-phase-opening.md)
- [8.1.0 — Guardrail di non-contaminazione](./8.1.0-non-contamination-guardrails.md)
- [8.1.1 — Semantic Scope Definition](./8.1.1-semantic-scope.md)
- [8.1.2 — Semantic Vocabulary & Contracts](./8.1.2-semantic-vocabulary-contracts.md)
- [8.2.1 — Semantic Aggregation Contract](./8.2.1-semantic-aggregation-contract.md)
- [8.2.2 — Priority, Ranking & Weighting Model](./8.2.2-priority-ranking-model.md)

Vocabolario **8.1.2**: SemanticExplanation (message, reasonCode?, optional: true). **MUST** essere usato **solo** questo tipo; **MUST NOT** introdurre nuovi campi semantici non dichiarati.

---

## Ambito CONSENTITO

Il microstep 8.2.3 **PUÒ**:

- Definire il **contratto** per spiegazioni e suggerimenti (forma, durata, invalidazione)
- Consentire ai SemanticModule di **restituire** `explanations` in SemanticModuleOutput (già previsto in 8.2.1)
- Esporre le explanation nello **SemanticSnapshot** come overlay (già presente: `explanations[]`)
- Introdurre un **kill-switch** dedicato per lo strato explanation/suggestions (es. `semantic-explanations`)
- Con kill-switch OFF: **nessuna** explanation/suggestion inclusa nello snapshot (o snapshot equivalente a assenza di explanation)
- Dichiarare **durata** e **condizioni di invalidazione** per le explanation (8.1.1 §5)
- Introdurre test che verificano: presenza/assenza in base a kill-switch, opzionalità, nessuna modifica al dato 7

---

## Ambito VIETATO (MUST NOT)

È **VIETATO** in 8.2.3:

- **Incorporare** explanation o suggestion nei Read Model Fase 7 (7.5) o in DTO 7.x
- **Attribuire** alla Fase 7 intenzionalità, “motivi”, “scelte” o narrative
- **Prescrivere** azioni (“dovresti”, “è meglio”, “si consiglia di” in senso autoritativo)
- **Sostituire** la decisione dell’utente con una “raccomandazione” vincolante
- Introdurre **reason** o **explanation** come parte della **fonte di verità** (la fonte resta Fase 7)
- Introdurre **UX** visibile, copy di prodotto o messaggi utente come scope del microstep (solo **contratto** e **forma**)
- Modificare il **Semantic Aggregation Contract (8.2.1)** o il modello di ranking (8.2.2)
- Introdurre **policy**, **enforcement** o **decision engine**

---

## Specifica architetturale richiesta

### 1. Documento architetturale (OBBLIGATORIO)

Creare:

**`docs/architecture/8.2.3-semantic-explanation-suggestions-contract.md`**

Il documento **DEVE** includere:

- **§1 — Stato del documento:** VINCOLANTE, congelabile, non estendibile senza nuova fase
- **§2 — Scopo del contratto:** strato esplicativo opzionale e revocabile; NON Read Model 7.5; NON voce della Fase 7
- **§3 — Definizione formale:** SemanticExplanation (solo vocabolario 8.1.2); message, reasonCode opzionale, optional: true
- **§4 — Principi vincolanti:** explanation ≠ decisione; suggestion ≠ comando; MUST NOT attribuire intent a Phase 7
- **§5 — Regole di inclusione nello snapshot:** aggregazione append-only (8.2.1); nessuna fusione con dato 7; durata e invalidazione dichiarate
- **§6 — Kill-switch e degradazione:** con kill-switch OFF nessuna explanation/suggestion applicata; snapshot senza strato esplicativo
- **§7 — Anti-pattern vietati:** no “perché la Fase 7 ha deciso”, no reason in Read Model 7.5, no prescrizioni, no autorità
- **§8 — Dichiarazione di chiusura:** formula notarile di freeze e vincolatività

**Tono:** architetturale / notarile. **Stile:** MUST / MUST NOT / VIETATO.

---

### 2. Modello e integrazione (tecnico)

- **Tipi:** usare **solo** SemanticExplanation, LocalizedText, DeclaredReason da 8.1.2 (vocabulary). **Nessun** nuovo tipo semantico; nessuna logica incorporata nei tipi.
- **SemanticModuleOutput:** già prevede `explanations?: readonly SemanticExplanation[]`. **Verificare** che la forma sia rispettata e che non si introduca validazione semantica sul contenuto (solo forma).
- **SemanticSnapshot:** già espone `explanations`. **Nessuna** modifica strutturale al contratto 8.2.1; al più **opzione** per escludere le explanation quando kill-switch explanations OFF (es. restituire snapshot con `explanations: []` quando disattivato).

---

### 3. Kill-switch dedicato

- Introdurre **SEMANTIC_EXPLANATIONS_COMPONENT_ID** (es. `'semantic-explanations'`) in SemanticKillSwitch.
- **isExplanationsEnabled(registry): boolean** — quando false, lo snapshot **MUST** essere prodotto **senza** includere explanation (es. engine o aggregatore filtra/azzera solo le explanation; **NON** modificare stati/rankings/contexts/policies).
- Con kill-switch OFF: comportamento **identificabile** con “nessuno strato esplicativo”; **NON** richiedere modifiche a Fase 7.

---

### 4. Engine (modifica limitata)

- Il SemanticEngine **MAY** consultare **isExplanationsEnabled(registry)**.
- Se explanations OFF: dopo aggregate(), **rimuovere** o **non includere** le explanation nello snapshot restituito (es. snapshot con stessi states/contexts/rankings/policies ma `explanations: []`).
- **NON** cambiare ordine, **NON** filtrare altri campi, **NON** introdurre logica decisionale.

---

## Test OBBLIGATORI

Creare o aggiornare test in `src/semantic-layer/engine/tests/` (o modulo dedicato).

I test **DEVONO** verificare **ESCLUSIVAMENTE**:

1. **Modulo che restituisce explanations** → snapshot contiene le explanation (con explanations ON).
2. **Kill-switch explanations OFF** → snapshot con `explanations.length === 0`; altri array (states, contexts, ecc.) **invariati**.
3. **Nessuna explanation** (moduli senza explanation) → `explanations` vuoto; comportamento coerente con 8.2.1.
4. **Forma SemanticExplanation** rispettata (message, optional: true; reasonCode opzionale).

I test **NON DEVONO**:

- Verificare contenuto narrativo o “qualità” delle explanation
- Introdurre “best”, “chosen”, “decision”, “recommended action”
- Testare policy o enforcement

---

## Vincoli finali

- **Nessuna** modifica a: Fase 7, Read Model 7.5, DTO 7.x, limiti 7.6
- **Nessuna** modifica al **contratto di aggregazione 8.2.1** (append-only, regole di merge)
- **Nessuna** modifica al modello di ranking 8.2.2
- **Nessuna** anticipazione di: policy applicativa, decision engine, enforcement, UX di prodotto
- Tutto **reversibile**, **auditabile**, **disattivabile** tramite kill-switch

---

## Output atteso

Al termine del microstep 8.2.3:

- Documento architetturale **8.2.3-semantic-explanation-suggestions-contract.md** completo e congelabile
- Kill-switch **semantic-explanations** e comportamento engine quando OFF (snapshot senza explanation)
- Codice compilabile e test verdi
- **Nessun** comportamento autoritativo: le explanation sono **descrizione**, non **comando**

---

## Riepilogo checklist implementativa

- [ ] Creare `docs/architecture/8.2.3-semantic-explanation-suggestions-contract.md` (§1–§8)
- [ ] Aggiungere `SEMANTIC_EXPLANATIONS_COMPONENT_ID` e `isExplanationsEnabled(registry)` in SemanticKillSwitch
- [ ] Integrare in SemanticEngine: se explanations OFF, restituire snapshot con `explanations: []` (senza toccare altri campi)
- [ ] Verificare SemanticModuleOutput / aggregatore: nessuna validazione semantica su explanation; solo forma
- [ ] Test: explanations presenti con ON; explanations vuote con OFF; forma SemanticExplanation; nessun altro array alterato da kill-switch
- [ ] Nessuna modifica a 8.2.1, 8.2.2, Fase 7

---

**Fine prompt — 8.2.3 Semantic Explanation & Suggestions Contract.**
