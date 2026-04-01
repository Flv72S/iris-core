# Flutter: installazione e prossimi passi

## Completato

1. **Download Flutter** – Clonato il repository Flutter (branch `stable`) in:
   - `C:\Users\flavi\flutter`

2. **PATH** – Aggiunto `C:\Users\flavi\flutter\bin` al **PATH utente** (variabile d’ambiente Windows).
   - Per averlo nel terminale corrente **chiudi e riapri** il terminale (o Cursor).

## Da fare (a mano)

### 1. Riaprire il terminale
Così il nuovo PATH viene caricato.

### 2. Prima esecuzione di Flutter (solo la prima volta)
Da qualsiasi cartella esegui:

```powershell
flutter --version
```

- La **prima volta** Flutter può scaricare il Dart SDK e fare altre configurazioni (anche 5–10 minuti).
- Se richiesto, accetta le licenze: `flutter doctor --android-licenses` (solo se sviluppi per Android).

### 3. Verificare l’ambiente
```powershell
flutter doctor
```

### 4. Eseguire i test del progetto Iris
```powershell
cd c:\Users\flavi\Iris\flutter_app
flutter pub get
flutter test
```

Se qualcosa non funziona, controlla che nel PATH ci sia `C:\Users\flavi\flutter\bin` (in Impostazioni di Windows → Variabili d’ambiente).
