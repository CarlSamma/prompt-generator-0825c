const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(bodyParser.json());

const resources = fs.readFileSync(path.resolve(__dirname, "resources.txt"), "utf-8");
function parseResources(content) {
  const lines = content.split('\n');
  const keys = {};
  for (const line of lines) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [k, v] = line.split('=');
      keys[k.trim()] = v.trim();
    }
  }
  return keys;
}
const apiKeys = parseResources(resources);

// Funzioni di chiamata API
async function callPerplexityAI(prompt) {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKeys.API_KEY_PERPLEXITY
    },
    body: JSON.stringify({
      model: "pplx-70b-online",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  } else {
    return "Errore Perplexity AI: " + JSON.stringify(data);
  }
}

async function callAnthropicClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKeys.API_KEY_ANTHROPIC,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (data?.content?.[0]?.text) {
    return data.content[0].text;
  } else {
    return "Errore Claude: " + JSON.stringify(data);
  }
}

async function callDeepSeek(prompt) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKeys.deepseek
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  } else {
    return "Errore DeepSeek: " + JSON.stringify(data);
  }
}

async function callOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKeys.API_KEY_OPENAI
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Errore OpenAI";
}

function logLLMResponse(step, artist, title, response) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${artist} - ${title}] [${step}]\n${response}\n---\n`;
  fs.appendFileSync(path.resolve(__dirname, "llm_responses.log"), logEntry, "utf-8");
}

// Orchestrazione pipeline
async function generatePromptPipeline(artist, title) {
  // Step 1: Perplexity AI
  const prompt1 = `Agisci come un musicologo esperto. Fornisci una descrizione dettagliata e approfondita del brano '${title}' dell'artista '${artist}'. Utilizza la tua conoscenza e ricerca informazioni su internet per analizzare: la struttura del brano, l'arrangiamento, il genere musicale, gli strumenti utilizzati, il tempo (BPM), l'atmosfera (mood), lo stile vocale e le caratteristiche della produzione. Sii il più descrittivo possibile. Non ci sono limiti di lunghezza.`;
  const step1 = await callPerplexityAI(prompt1);
  logLLMResponse("PerplexityAI", artist, title, step1);

  // Step 2: Anthropic Claude
  const prompt2 = `Analizza il testo seguente e arricchiscilo con dettagli specifici sul genere e sui sottogeneri musicali. Identifica influenze, epoche di riferimento e stili correlati. Concentrati sulla struttura e arrangiamento del brano e del mood/genere:\n\n${step1}`;
  const step2 = await callAnthropicClaude(prompt2);
  logLLMResponse("AnthropicClaude", artist, title, step2);

  // Step 3: DeepSeek
  const prompt3 = `A partire da questa analisi musicale, espandi la sezione relativa all'arrangiamento e alla strumentazione. Descrivi nel dettaglio il ruolo e il suono di ogni strumento (es. 'chitarra elettrica con un leggero riverbero', 'basso synth pulsante', 'batteria acustica con rullante secco'):\n\n${step2}`;
  const step3 = await callDeepSeek(prompt3);
  logLLMResponse("DeepSeek", artist, title, step3);

  // Step 4: OpenAI
  const prompt4 = `Raffina la descrizione dell'atmosfera (mood), delle emozioni evocate e della qualità della produzione. Utilizza aggettivi evocativi (es. 'sognante', 'malinconico', 'energico') e descrivi le tecniche di produzione (es. 'suono pulito e moderno', 'produzione lo-fi con calore analogico'):\n\n${step3}`;
  const step4 = await callOpenAI(prompt4);
  logLLMResponse("OpenAI-1", artist, title, step4);

  // Prompt finale
  const finalPromptInput = `Sintetizza la seguente analisi musicale dettagliata in un prompt per un\'IA generativa di musica come Suno. Il prompt deve rispettare le seguenti regole:
- Non deve superare i 300 caratteri, spazi inclusi.
- Non deve contenere alcun nome di artista o titolo di brano.
- Deve essere in lingua inglese.
- Deve includere una descrizione della struttura del brano (es. intro, verse, chorus, bridge, outro).
- Deve catturare l\'essenza del brano originale, del suo arrangiamento, della sua strumentazione e del suo mood.

Analisi completa:\n${step4}`;
  const finalPrompt = await callOpenAI(finalPromptInput);
  logLLMResponse("OpenAI-finalPrompt", artist, title, finalPrompt);

  return {
    step1, step2, step3, step4, finalPrompt
  };
}

// Endpoint API
app.post("/generate-prompt", async (req, res) => {
  const { artist, title } = req.body;
  if (!artist || !title) {
    return res.status(400).json({ error: "artist e title sono obbligatori" });
  }
  try {
    const results = await generatePromptPipeline(artist, title);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Errore backend: " + err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Suno Prompt Generator backend avviato su http://localhost:${PORT}`);
});
