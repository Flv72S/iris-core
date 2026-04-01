# Phase 11.2.2 — Execution Intent Channel

## Ruolo degli intent in IRIS

Gli intent sono l’unico canale consentito per **Flutter UI → Bridge → Core IRIS**: comandi espliciti, tipizzati e serializzabili. Il client non esegue azioni, non valuta policy e non decide outcome; può solo creare intent, serializzarli e inviarli al Core, ricevendo una risposta deterministica (DecisionTraceDto).

Tipi ammessi:
- **ActionIntent** — azione con tipo e parametri (intentId, actionType, parameters, timestamp).
- **ModeChangeIntent** — cambio modo (intentId, targetModeId, timestamp).

Vietati: intent generici, impliciti, parametri opzionali semantici, fallback automatici.

## Separazione comando / esecuzione

- **Client:** costruisce intent immutabili e li invia tramite `IntentChannel` (sendAction / sendModeChange).
- **Channel:** trasporta l’intent verso il Core; non contiene logica di business, retry o trasformazioni semantiche.
- **Core:** riceve l’intent, valida, esegue policy e restituisce un trace. L’esecuzione avviene solo lato Core.

Il bridge espone un canale astratto (`IntentChannel`) e uno stub deterministico (`StubIntentChannel`) per test e certificazione; l’implementazione reale che parla al Core sarà inserita in seguito.

## Idempotenza e replay auditabile

- Stesso intent + stesso stato Core → stessa risposta, stesso trace, stesso outcome.
- Il channel è progettato in modo puramente funzionale: nessun side-effect locale, nessun retry automatico nascosto.
- La serializzazione degli intent usa ordine di chiavi stabile ed è compatibile con l’hash SHA-256 già definito, così da supportare replay e verifica.

## Sicurezza contro logica client-side

- Nel bridge intent/channel non sono ammessi: `DateTime.now()`, `Random()`, retry automatici, branching semantico.
- I test di certificazione verificano: round-trip intent → json → intent, stabilità dell’hash, idempotenza dello stub (stesso intent → stessa DecisionTraceDto) e assenza di pattern vietati nel codice sorgente del bridge.

## Strategia futura di connessione al Core reale

- Sostituire `StubIntentChannel` con un’implementazione che invii gli intent al Core (es. HTTP, WebSocket, FFI) mantenendo la stessa interfaccia.
- La serializzazione deterministica e il contratto degli intent restano invariati; l’unico cambiamento è il trasporto e la risposta reale del Core.
