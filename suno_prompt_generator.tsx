import React, { useState } from 'react';
import { Music, Search, Loader2, Copy, CheckCircle, AlertCircle, Play } from 'lucide-react';

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
    { name: 'Perplexity AI', description: 'Analisi iniziale e ricerca', icon: Search },
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
      // NOTE: This is using a hardcoded API key. In a real application, this should be handled securely.
      const apiKey = "85da4ac712c86e1592888a6eed4d3cd0";
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=10`;
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
      const response = await fetch('http://localhost:3001/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore del server');
      }

      const data = await response.json();
      setResults(data);
      setCurrentStep(5); // Mark all steps as complete
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Music className="w-10 h-10 text-purple-300" />
            <h1 className="text-4xl font-bold text-white">Suno AI Prompt Generator</h1>
          </div>
          <p className="text-purple-200 text-lg">
            Trasforma qualsiasi brano musicale in un prompt ottimizzato per Suno AI
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Inserisci i dettagli del brano</h2>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-purple-200">
              <input
                type="radio"
                checked={!useLastFM}
                onChange={() => setUseLastFM(false)}
                disabled={isLoading}
              />
              Inserimento manuale
            </label>
            <label className="flex items-center gap-2 text-purple-200">
              <input
                type="radio"
                checked={useLastFM}
                onChange={() => setUseLastFM(true)}
                disabled={isLoading}
              />
              Seleziona da Last.fm
            </label>
            {useLastFM && (
              <button
                onClick={fetchRecentTracksFromLastFM}
                disabled={isFetchingTracks || isLoading}
                className="ml-4 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm"
              >
                {isFetchingTracks ? "Caricamento..." : "Carica brani recenti"}
              </button>
            )}
          </div>
          {!useLastFM ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 mb-2">Artista</label>
                <input
                  type="text"
                  value={trackInput.artist}
                  onChange={(e) => setTrackInput(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="Nome dell'artista"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-purple-200 mb-2">Titolo</label>
                <input
                  type="text"
                  value={trackInput.title}
                  onChange={(e) => setTrackInput(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Titolo del brano"
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            <div>
              {recentTracks.length === 0 ? (
                <div className="text-purple-200 text-sm">Nessun brano caricato. Premi "Carica brani recenti".</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {recentTracks.map((track: any, idx) => (
                    <button
                      key={idx}
                      className={`w-full text-left px-4 py-3 rounded-lg border border-white/30 bg-white/10 text-white hover:bg-purple-700 transition-colors mb-2`}
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
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || (!trackInput.artist.trim() || !trackInput.title.trim())}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-6">Pipeline di Elaborazione</h2>
            <div className="space-y-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === index + 1;
                const isCompleted = currentStep > index + 1;
                const isWaiting = currentStep < index + 1;

                return (
                  <div key={index} className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
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
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
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
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Prompt Generato per Suno AI</h2>
            <div className="bg-black/30 rounded-lg p-4 border border-purple-400/30">
              <p className="text-white leading-relaxed mb-4">{results.finalPrompt}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-200">
                  Caratteri: {results.finalPrompt.length}/300
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
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
              <p className="text-blue-200 text-sm">
                💡 <strong>Come usarlo:</strong> Copia il prompt generato e incollalo nel campo di testo di Suno AI per creare la tua musica personalizzata!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SunoPromptGenerator;
