import React, { useState } from 'react';
import { Music, Search, Loader2, Copy, CheckCircle, AlertCircle, Play } from 'lucide-react';
import apiKeys from '../apiKeys';

// Funzioni di chiamata API per ogni provider
async function callGoogleAI(prompt: string) {
  // Esempio: endpoint Gemini (Google AI Studio)
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKeys.GOOGLE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  const data = await response.json();
  // Gemini: risposta in data.candidates[0].content.parts[0].text
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Errore Google AI";
}

async function callAnthropicClaude(prompt: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKeys.ANTHROPIC,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  return data?.content?.[0]?.text || "Errore Claude";
}

async function callDeepSeek(prompt: string) {
  // DeepSeek API (OpenAI compatible)
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKeys.DEEPSEEK
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Errore DeepSeek";
}

async function callOpenAI(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKeys.OPENAI
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

const SunoPromptGenerator = () => {
  const [trackInput, setTrackInput] = useState({ artist: '', title: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState({
    step1: '',
    step2: '',
    step3: '',
    step4: '',
    finalPrompt: ''
  });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Stato per Last.fm
  const [useLastFM, setUseLastFM] = useState(false);
  const [recentTracks, setRecentTracks] = useState([]);
  const [isFetchingTracks, setIsFetchingTracks] = useState(false);

  const steps = [
    { name: 'Google AI', description: 'Analisi iniziale e ricerca', icon: Search },
    { name: 'Claude (Anthropic)', description: 'Genere e stile', icon: Music },
    { name: 'DeepSeek', description: 'Arrangiamento e strumentazione', icon: Play },
    { name: 'OpenAI', description: 'Mood e sintesi finale', icon: CheckCircle }
  ];

  // Funzione per fetch brani recenti da Last.fm
  const fetchRecentTracksFromLastFM = async () => {
    setIsFetchingTracks(true);
    setError('');
    try {
      const username = prompt("Inserisci il tuo username Last.fm:");
      if (!username) {
        setError("Username Last.fm non fornito.");
        setIsFetchingTracks(false);
        return;
      }
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKeys.LASTFM.apiKey}&format=json&limit=10`;
      const response = await fetch(url);
      const data = await response.json();
      if (data?.recenttracks?.track) {
        setRecentTracks(data.recenttracks.track);
      } else {
        setError("Nessun brano trovato o errore Last.fm.");
      }
    } catch (err) {
      setError("Errore Last.fm: " + err.message);
    }
    setIsFetchingTracks(false);
  };

  // Step 1: Google AI
  const processStep1 = async (artist, title) => {
    const prompt = `Agisci come un musicologo esperto. Fornisci una descrizione dettagliata e approfondita del brano '${title}' dell'artista '${artist}'. Utilizza la tua conoscenza e ricerca informazioni su internet per analizzare: la struttura del brano, l'arrangiamento, il genere musicale, gli strumenti utilizzati, il tempo (BPM), l'atmosfera (mood), lo stile vocale e le caratteristiche della produzione. Sii il più descrittivo possibile. Non ci sono limiti di lunghezza.`;
    return await callGoogleAI(prompt);
  };

  // Step 2: Anthropic Claude
  const processStep2 = async (previousAnalysis) => {
    const prompt = `Analizza il testo seguente e arricchiscilo con dettagli specifici sul genere e sui sottogeneri musicali. Identifica influenze, epoche di riferimento e stili correlati. Concentrati sulla struttura e arrangiamento del brano e del mood/genere:\n\n${previousAnalysis}`;
    return await callAnthropicClaude(prompt);
  };

  // Step 3: DeepSeek
  const processStep3 = async (previousAnalysis) => {
    const prompt = `A partire da questa analisi musicale, espandi la sezione relativa all'arrangiamento e alla strumentazione. Descrivi nel dettaglio il ruolo e il suono di ogni strumento (es. 'chitarra elettrica con un leggero riverbero', 'basso synth pulsante', 'batteria acustica con rullante secco'):\n\n${previousAnalysis}`;
    return await callDeepSeek(prompt);
  };

  // Step 4: OpenAI
  const processStep4 = async (previousAnalysis) => {
    const prompt = `Raffina la descrizione dell'atmosfera (mood), delle emozioni evocate e della qualità della produzione. Utilizza aggettivi evocativi (es. 'sognante', 'malinconico', 'energico') e descrivi le tecniche di produzione (es. 'suono pulito e moderno', 'produzione lo-fi con calore analogico'):\n\n${previousAnalysis}`;
    return await callOpenAI(prompt);
  };

  // Prompt finale: OpenAI
  const generateFinalPrompt = async (completeAnalysis) => {
    const prompt = `Sintetizza la seguente analisi musicale dettagliata in un prompt per un'IA generativa di musica come Suno. Il prompt deve rispettare le seguenti regole:
- Non deve superare i 300 caratteri, spazi inclusi.
- Non deve contenere alcun nome di artista o titolo di brano.
- Deve essere in lingua inglese.
- Deve catturare l'essenza del brano originale, del suo arrangiamento, della sua strumentazione e del suo mood.

Analisi completa:\n${completeAnalysis}`;
    return await callOpenAI(prompt);
  };

  const handleGenerate = async () => {
    if (!trackInput.artist.trim() || !trackInput.title.trim()) {
      setError('Inserisci sia l\'artista che il titolo del brano');
      return;
    }

    setIsLoading(true);
    setError('');
    setCurrentStep(0);
    setResults({
      step1: '',
      step2: '',
      step3: '',
      step4: '',
      finalPrompt: ''
    });

    try {
      setCurrentStep(1);
      const response = await fetch("http://localhost:3001/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist: trackInput.artist,
          title: trackInput.title
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Errore backend");
      }
      const data = await response.json();
      setResults({
        step1: data.step1,
        step2: data.step2,
        step3: data.step3,
        step4: data.step4,
        finalPrompt: data.finalPrompt
      });
      setCurrentStep(5);
    } catch (err) {
      setError('Errore durante la generazione del prompt: ' + err.message);
      console.error('Errore:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(results.finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Errore nella copia:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-purple-900 p-0 md:p-4 flex flex-col">
      <header className="w-full shadow-lg bg-gradient-to-r from-purple-800/80 to-blue-900/80 py-6 px-4 flex flex-col items-center mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Music className="w-12 h-12 text-purple-300 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">Suno AI Prompt Generator</h1>
        </div>
        <p className="text-purple-100 text-lg md:text-xl font-medium text-center max-w-2xl">
          Trasforma qualsiasi brano musicale in un prompt ottimizzato per Suno AI con una pipeline multi-LLM.
        </p>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          {/* Card principale */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/20 mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Genera il tuo prompt</h2>
            {/* Input Form */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center">
                <label className="flex items-center gap-2 text-purple-200">
                  <input
                    type="radio"
                    checked={!useLastFM}
                    onChange={() => setUseLastFM(false)}
                    disabled={isLoading}
                  />
                  <span className="font-medium">Inserimento manuale</span>
                </label>
                <label className="flex items-center gap-2 text-purple-200">
                  <input
                    type="radio"
                    checked={useLastFM}
                    onChange={() => setUseLastFM(true)}
                    disabled={isLoading}
                  />
                  <span className="font-medium">Seleziona da Last.fm</span>
                </label>
                {useLastFM && (
                  <button
                    onClick={fetchRecentTracksFromLastFM}
                    disabled={isFetchingTracks || isLoading}
                    className="ml-0 md:ml-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow transition"
                  >
                    {isFetchingTracks ? "Caricamento..." : "Carica brani recenti"}
                  </button>
                )}
              </div>
              {!useLastFM ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-200 mb-2 font-medium">Artista</label>
                    <input
                      type="text"
                      value={trackInput.artist}
                      onChange={(e) => setTrackInput(prev => ({ ...prev, artist: e.target.value }))}
                      placeholder="Nome dell'artista"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none transition-colors font-semibold"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-purple-200 mb-2 font-medium">Titolo</label>
                    <input
                      type="text"
                      value={trackInput.title}
                      onChange={(e) => setTrackInput(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Titolo del brano"
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none transition-colors font-semibold"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {recentTracks.length === 0 ? (
                    <div className="text-purple-200 text-sm text-center">Nessun brano caricato. Premi "Carica brani recenti".</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {recentTracks.map((track: any, idx) => (
                        <button
                          key={idx}
                          className={`w-full text-left px-4 py-3 rounded-xl border border-white/30 bg-white/10 text-white hover:bg-purple-700 transition-colors mb-2 font-semibold shadow`}
                          disabled={isLoading}
                          onClick={() => setTrackInput({ artist: track.artist['#text'] || track.artist.name, title: track.name })}
                        >
                          <span className="font-semibold">{track.artist['#text'] || track.artist.name}</span> - <span>{track.name}</span>
                          {track.album && <span className="ml-2 text-purple-300 text-xs">({track.album['#text']})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-200 font-semibold">{error}</span>
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={isLoading || (!trackInput.artist.trim() || !trackInput.title.trim())}
                className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generazione in corso...
                  </>
                ) : (
                  <>
                    <Music className="w-5 h-5" />
                    Genera Prompt
                  </>
                )}
              </button>
            </div>
            {/* Pipeline Steps */}
            {(isLoading || results.finalPrompt) && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6 text-center">Pipeline di Elaborazione</h2>
                <div className="flex flex-col gap-4">
                  {steps.map((step, index) => {
                    const StepIcon = step.icon;
                    const isActive = currentStep === index + 1;
                    const isCompleted = currentStep > index + 1;
                    return (
                      <div key={index} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 shadow ${
                        isActive ? 'bg-purple-600/30 border-2 border-purple-400' : 
                        isCompleted ? 'bg-green-600/20 border border-green-400/30' :
                        'bg-white/5 border border-white/10'
                      }`}>
                        <div className={`p-2 rounded-full ${
                          isActive ? 'bg-purple-500 animate-pulse' :
                          isCompleted ? 'bg-green-500' :
                          'bg-gray-600'
                        }`}>
                          {isActive ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <StepIcon className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{step.name}</h3>
                          <p className="text-sm text-purple-200">{step.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isActive ? 'bg-purple-500 text-white' :
                          isCompleted ? 'bg-green-500 text-white' :
                          'bg-gray-600 text-gray-300'
                        }`}>
                          {isActive ? 'In corso...' : isCompleted ? 'Completato' : 'In attesa'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Final Result */}
            {results.finalPrompt && (
              <div className="bg-gradient-to-br from-purple-900/80 to-blue-900/80 rounded-2xl p-6 border border-white/20 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4 text-center">Prompt Generato per Suno AI</h2>
                <div className="bg-black/40 rounded-lg p-4 border border-purple-400/30 shadow-inner">
                  <p className="text-white leading-relaxed mb-4 text-lg font-mono">{results.finalPrompt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-200">
                      Caratteri: {results.finalPrompt.length}/300
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copiato!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copia
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-600/20 border border-blue-400/30 rounded-lg">
                  <p className="text-blue-200 text-sm text-center">
                    💡 <strong>Come usarlo:</strong> Copia il prompt generato e incollalo nel campo di testo di Suno AI per creare la tua musica personalizzata!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="w-full text-center py-4 text-purple-200 text-xs opacity-80 mt-8">
        &copy; 2025 Suno Prompt Generator &mdash; Powered by LLM Pipeline
      </footer>
    </div>
  );
};

export default SunoPromptGenerator;
