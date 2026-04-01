## IRIS — STEP 0 — Tooling & Test Runner Enablement (BLOCKER REMOVAL)

## Stato iniziale (perché i test erano BLOCKED)

### Sintomo
- `npm test` fallisce con:
  - `"vitest" non è riconosciuto come comando interno o esterno`

### Evidenza tecnica
- `package.json` contiene già:
  - `scripts.test = "vitest run"`
  - `devDependencies.vitest = "^1.0.0"`
- Ma `node_modules/vitest` **non è presente** (install non completata), quindi lo script non trova l’eseguibile.

---

## Esito installazione dipendenze (perché `npm install` fallisce)

### Blocco principale (deterministico)
L’installazione fallisce su `better-sqlite3` con build nativa su Windows:
- Node attuale: `v24.11.0`
- Errore:
  - `fatal error C1189: #error: "C++20 or later required."`
  - toolchain rilevata: VS2019 BuildTools (compila con `/std:c++17`)
  - `prebuild-install warn install No prebuilt binaries found (target=24.11.0 ...)`

In pratica: con **Node 24** non c’è un binario precompilato disponibile per `better-sqlite3` nel tuo contesto, e la compilazione locale fallisce perché richiede **C++20**.

### Rumore/secondario (frequente su Windows)
Durante i tentativi si osservano anche:
- `EPERM` su cleanup di `node_modules` (file lock / antivirus / editor)

Questo può aggravare, ma **non è la causa primaria**: anche senza EPERM, il build di `better-sqlite3` su Node 24 resta bloccante.

---

## Modifiche effettuate (diff concettuale)

- `package.json` aggiornato per **vincolare Node a 20 LTS**:
  - `engines.node: ">=20.0.0 <21"`
- Vitest e script npm erano già corretti (nessuna modifica su questo punto).
- **Nessuna modifica** a `src/**` o ai test.

---

## Comando unico ufficiale per eseguire i test

```bash
npm test
```

---

## Stato attuale dello STEP

### Exit Criteria
1. `npm test` è un comando valido → **NO (BLOCKED)** (runner non installato)
2. vitest non è mai chiamato direttamente → **OK**
3. Nessun file applicativo o di test è stato modificato → **OK**
4. I microstep successivi possono usare `npm test` come gate → **NO (BLOCKED)**

### Dichiarazione richiesta
**NON applicabile in questo momento**: non posso dichiarare “Il progetto è ora test-runnable via npm scripts” perché `npm install` non completa, quindi `npm test` non può partire.

---

## Azione necessaria (operativa) — Node 20 LTS

Per completare lo STEP 0 è necessario che **Node 20 LTS** sia effettivamente quello in uso sul sistema.

Evidenza attuale:
- `node -v` risulta `v24.11.0` (incompatibile con l’install di `better-sqlite3` nel tuo contesto).

Comando diretto (Windows, da **cmd come Administrator**) per installare/downgradare Node 20 LTS via Chocolatey:

```bat
choco install nodejs-lts --version=20.11.1 -y --allow-downgrade
```

Poi verificare:

```bat
node -v
npm -v
```

Infine (nel repo):

```bat
npm install --no-package-lock
npm test -- --help
```

