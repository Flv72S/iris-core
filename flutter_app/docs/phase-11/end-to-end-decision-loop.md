# Phase 11.4.1 — End-to-End Deterministic Decision Loop

## Chiusura del ciclo IRIS lato client

Il ciclo **Intent → Trace → Replay UI** è certificato end-to-end: la UI non partecipa più al processo decisionale e diventa una **proiezione deterministica del log decisionale**.

## Flusso unico e lineare

1. **Intent esplicito** — L'utente (o il test) invia un `ActionIntent` o `ModeChangeIntent`.
2. **IntentChannel** — Il canale (stub o reale) invia l'intent al Core e riceve un `DecisionTraceDto`. Nessuna decisione client.
3. **TraceValidator** — Il trace viene validato (struttura, hash, versione contratto). Se non valido: nessun salvataggio, nessun aggiornamento UI.
4. **ReplayTraceStore** — Solo trace validati vengono salvati. Lo store è l'unica fonte di verità per la navigazione.
5. **DecisionLoopNotifier** — Dopo ogni salvataggio valido, il notifier viene incrementato. Nessun payload semantico: serve solo a far ricostruire la UI.
6. **TraceNavigationHost** — Ascolta il notifier e ricostruisce lo stack di pagine **solo leggendo** `ReplayTraceStore`. Nessuna route derivata dall'intent; solo dai trace salvati.

## Componenti

- **DecisionLoopController** — Riceve IntentChannel, TraceValidator, ReplayTraceStore, DecisionLoopNotifier. Metodi: executeAction(intent), executeModeChange(intent). Pipeline obbligatoria: send, receive, validate, save (se valido), notify (se salvato). Vietato: branching semantico, retry, fallback, logica su outcome, tempo/random, async non controllato.
- **DecisionLoopResult** — DTO immutabile: traceId, storeHashAfterSave, isSuccess, errors. Solo per audit e test deterministici.
- **DecisionLoopNotifier** — ValueNotifier di int. Incremento solo dopo save valido; nessun payload; trigger per rebuild del navigation host.
- **TraceNavigationHost** — Esteso con parametro opzionale notifier. Quando il notifier cambia, lo host rilegge lo store e ricostruisce lo stack. Nessuna route derivata dall'intent direttamente.

## Separazione assoluta decisione / UI

- **Decisione:** avviene nel Core (o nello stub). Il client invia intent e riceve trace; non interpreta l'outcome.
- **UI:** legge solo il ReplayTraceStore e il notifier. Stack e pagine sono derivati esclusivamente dai trace salvati. Replay identico a parità di input (stesso intent, stesso trace, stesso store, stessa UI).

## Replay auditabile completo

- Stesso intent, stesso ambiente → stesso traceId, stesso storeHashAfterSave, stesso stack di pagine.
- Idempotenza: stesso intent N volte (con stub che restituisce lo stesso trace) → un solo trace nello store, nessun duplicato incoerente.
- Trace non valido → non salvato, notifier non aggiornato, DecisionLoopResult.isSuccess false, navigazione invariata.

## Implicazioni regolatorie e forensi

- **Auditability:** ogni azione utente è un intent esplicito; ogni effetto visivo è determinato da un trace validato e salvato. Il log (store + hash) è la prova formale del percorso.
- **Determinism:** nessun DateTime.now, Random, retry dinamici o logica decisionale client. Test golden certificano replay visivo identico.
- **Forense:** in caso di contestazione si può riprodurre lo stato della UI a partire dal log dei trace e dallo store hash.

## Criteri di completamento (Phase 11.4.1)

- Decision loop lineare implementato.
- Trace sempre validato prima del salvataggio.
- ReplayTraceStore unica fonte di verità UI.
- Navigation aggiornata solo via notifier deterministico.
- Idempotenza e determinismo end-to-end verificati da test.
- Golden UI stabili (1 intent, 3 intenti sequenziali).
- Nessuna logica decisionale client; test forbidden_logic verdi.
- Documentazione generata.

Dopo questo step, IRIS è un **sistema auditabile end-to-end**: la UI è una proiezione deterministica del log decisionale.
