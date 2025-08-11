# Suno Prompt Generator

Generatore di prompt ottimizzati per Suno AI a partire da qualsiasi brano musicale, orchestrando una pipeline multi-LLM.

## Architettura Pipeline

1. **Input Brano**
   - Manuale: inserimento artista e titolo.
   - Last.fm: selezione da ultimi brani ascoltati tramite API (richiede username Last.fm).

2. **Orchestrazione LLM**
   - **Step 1: Google AI (Gemini)**
     - Analisi iniziale e ricerca dettagliata del brano.
   - **Step 2: Anthropic Claude**
     - Arricchimento su genere, sottogeneri, influenze, epoche.
   - **Step 3: DeepSeek**
     - Dettaglio su arrangiamento e strumentazione.
   - **Step 4: OpenAI**
     - Mood, produzione, sintesi finale e generazione prompt in inglese (max 300 caratteri, senza nomi di artista/titolo).

3. **Output**
   - Prompt pronto per Suno AI, copiabile con un click.

## Dipendenze principali

- React
- lucide-react (icone)
- API key per: Google AI, Anthropic, DeepSeek, OpenAI, Last.fm (vedi `apiKeys.ts`)

## File principali

- `suno_prompt_generator.tsx` — Componente React principale, UI e orchestrazione pipeline.
- `apiKeys.ts` — Oggetto con tutte le chiavi API (solo per prototipo, non esporre in produzione).

## Avvio Backend

1. Assicurati di avere [Node.js](https://nodejs.org/) installato.
2. Installa le dipendenze backend:
   ```bash
   npm install express cors body-parser node-fetch
   ```
3. Avvia il backend:
   ```bash
   node server.js
   ```
   Il backend sarà attivo su [http://localhost:3001](http://localhost:3001).

## Avvio Frontend

1. In un altro terminale, installa le dipendenze frontend:
   ```bash
   npm install
   ```
2. Avvia il frontend:
   ```bash
   npm run dev
   ```
3. Apri il browser su [http://localhost:5173](http://localhost:5173) (o la porta indicata in console).

> **Nota:** Se ricevi errori su moduli mancanti (es. `lucide-react`), installali con:
> ```bash
> npm install lucide-react
> ```

## Architettura

- **Frontend**: React + Vite, UI moderna, comunica solo con il backend tramite POST `/generate-prompt`.
- **Backend**: Node.js/Express, gestisce la pipeline multi-LLM (Google AI, Anthropic Claude, DeepSeek, OpenAI) e restituisce il prompt finale.
- **Sicurezza**: Le chiavi API sono lette solo lato server e non sono mai esposte al client.

## Esempio di richiesta API

Il frontend invia una richiesta:
```http
POST http://localhost:3001/generate-prompt
Content-Type: application/json

{
  "artist": "Nome Artista",
  "title": "Titolo Brano"
}
```
La risposta contiene tutti gli step della pipeline e il prompt finale.


## Come usare

1. Inserisci artista e titolo, oppure seleziona un brano da Last.fm.
2. Premi "Genera Prompt".
3. Attendi la pipeline (visualizzata step-by-step).
4. Copia il prompt generato e incollalo in Suno AI.

## Note di sicurezza

**Non esporre le chiavi API in frontend in produzione!**  
Per prototipazione locale, le chiavi sono in `apiKeys.ts`. In produzione, spostare la logica di orchestrazione e le chiavi lato server.

## Esempio di prompt generato

```
[0.00-0.45 intro, melodic instrumental], [0.45-1.30] the sound gets deeper into rhythm and bass line becomes dominant while vocals engage in a rhythmic session; Epic orchestral cinematic music, powerful choir, intense strings, thunderous percussion, driving rhythm; [1.30-2.45] building tension, adventurous and heroic mood, slow tempo, 80 bpm, produced for a blockbuster movie trailer.
```

## Autore

Prompt Generator Team — 2025
