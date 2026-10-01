'use client';

import { useState, useRef } from 'react';

interface Flashcard {
  question: string;
  answer: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported browser MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
      mimeTypeRef.current = mimeType;

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = handleAudioStop;
      mediaRecorderRef.current.start(100); // Collect slice every 100ms
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone access was denied or is not supported by your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop all browser media tracks (turns off recording indicator light)
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const handleAudioStop = async () => {
    const rawType = mimeTypeRef.current.split(';')[0]; // Extracted base mime type (e.g., audio/webm)
    const audioBlob = new Blob(audioChunksRef.current, { type: rawType });
    
    // Set local playback URL for demo preview
    setAudioUrl(URL.createObjectURL(audioBlob));

    const formData = new FormData();
    // Choose file extension matching mime type
    const ext = rawType.includes('mp4') ? 'mp4' : rawType.includes('ogg') ? 'ogg' : 'webm';
    formData.append('file', audioBlob, `recording.${ext}`);

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.cards) {
        setCards(data.cards);
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process audio. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12 max-w-4xl mx-auto font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-500 tracking-tight mb-3">
          ⚡ Speak2Study 2.0
        </h1>
        <p className="text-slate-400 text-base md:text-lg">
          Speak your study notes &rarr; Instant structured flashcards powered by Gemini Multimodal AI
        </p>
      </header>

      {/* Recording Control Panel */}
      <section className="flex flex-col items-center justify-center gap-4 mb-10">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span className="text-2xl">🎙️</span> Start Voice Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-500 px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 shadow-lg shadow-red-900/40 animate-pulse transition-all cursor-pointer"
          >
            <span className="text-2xl">🛑</span> Stop &amp; Generate Cards
          </button>
        )}

        {/* Local Audio Playback Preview */}
        {audioUrl && !isRecording && (
          <div className="mt-2 text-center">
            <p className="text-xs text-slate-400 mb-1">Your Recording Preview:</p>
            <audio src={audioUrl} controls className="h-10 rounded-lg border border-slate-800" />
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center gap-2 text-blue-400 my-4 animate-pulse">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold">Gemini is analyzing raw audio and generating cards...</p>
          </div>
        )}

        {/* Error Message Display */}
        {error && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-xl text-sm max-w-md text-center mt-2">
            ⚠️ {error}
          </div>
        )}
      </section>

      {/* Flashcards Deck Display */}
      {cards.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 text-slate-200 border-b border-slate-800 pb-2">
            Generated Flashcard Deck ({cards.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {cards.map((card, i) => (
              <div 
                key={i} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-900">
                      Card #{i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-4 leading-snug">
                    {card.question}
                  </h3>
                </div>

                <details className="cursor-pointer group mt-2 pt-3 border-t border-slate-800/80">
                  <summary className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors list-none flex items-center justify-between">
                    <span>REVEAL ANSWER</span>
                    <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="mt-3 text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed">
                    {card.answer}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}