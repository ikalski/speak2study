'use client';

import { useState, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  Square, 
  Loader2, 
  RefreshCw, 
  CheckCircle2,
  Zap
} from 'lucide-react';

interface Flashcard {
  id: string;
  category: string;
  question: string;
  answer: string;
}

interface FlashcardDeck {
  topic: string;
  cards: Flashcard[];
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone permission is required for Speak2Study.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadAudioToBackend = async (audioBlob: Blob) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'study_notes.webm');

    try {
      const res = await fetch(`${API_URL}/api/process-audio`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Processing failed");
      const data: FlashcardDeck = await res.json();
      setDeck(data);
    } catch (err) {
      alert("Failed to process audio. Try the Instant Demo Mode if venue network is congested!");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockDemoData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDeck({
        topic: "Quantum Physics & Wave Mechanics",
        cards: [
          {
            id: "1",
            category: "Core Concept",
            question: "What is Wave-Particle Duality?",
            answer: "The concept that matter and light exhibit behaviors of both waves and particles depending on measurement."
          },
          {
            id: "2",
            category: "Formula",
            question: "What is Heisenberg's Uncertainty Principle formula?",
            answer: "Δx · Δp ≥ ℏ / 2. You cannot simultaneously know both the exact position and momentum of a particle."
          },
          {
            id: "3",
            category: "Definition",
            question: "What is Quantum Entanglement?",
            answer: "A phenomenon where entangled particles remain connected such that actions performed on one instantly affect the other."
          }
        ]
      });
      setIsLoading(false);
    }, 1200);
  };

  const toggleFlip = (cardId: string) => {
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-900/15 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-[#0d111a]/80 backdrop-blur-md px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-300 via-blue-200 to-indigo-400 bg-clip-text text-transparent">
            Speak2Study 2.0
          </span>
        </div>
        
        <button 
          onClick={loadMockDemoData} 
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3.5 py-2 rounded-full transition-all cursor-pointer shadow-sm hover:border-slate-600"
        >
          <Zap className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
          <span>Load Sample Deck (Failsafe)</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center">
        {!deck && !isLoading && (
          <div className="text-center max-w-2xl flex flex-col items-center my-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-normal tracking-tight mb-6 leading-tight text-slate-100">
              Speak Your Notes. <br />
              <span className="font-sans font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                Gemini Builds Your Study Deck.
              </span>
            </h1>
            <p className="text-slate-400 mb-10 text-base md:text-lg max-w-xl font-light leading-relaxed">
              Record lectures or speak aloud—Gemini 2.5 Native Multimodal processes audio directly into study cards.
            </p>

            <div className="flex flex-col items-center space-y-5">
              {!isRecording ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500"></div>
                  <button
                    onClick={startRecording}
                    className="relative w-28 h-28 rounded-full bg-gradient-to-b from-indigo-600 to-indigo-800 border border-indigo-400/30 hover:scale-105 transition-all duration-300 shadow-2xl flex items-center justify-center cursor-pointer"
                  >
                    <Mic className="w-10 h-10 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-28 h-28 rounded-full bg-red-600/90 hover:bg-red-500 border border-red-400/40 animate-pulse transition-all shadow-2xl shadow-red-500/30 flex items-center justify-center cursor-pointer"
                >
                  <Square className="w-9 h-9 text-white fill-white" />
                </button>
              )}

              <span className="text-sm font-medium tracking-wide text-slate-400">
                {isRecording ? `Recording... (${recordingTime}s)` : "Tap to Begin"}
              </span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center space-y-6 my-auto text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin absolute inset-0 m-auto" />
            </div>
            <p className="text-slate-300 font-medium text-lg">
              Gemini 2.5 analyzing raw audio stream & structuring JSON output...
            </p>
          </div>
        )}

        {deck && !isLoading && (
          <div className="w-full space-y-8 my-auto">
            <div className="flex justify-between items-end border-b border-slate-800/80 pb-5">
              <div>
                <span className="text-xs text-indigo-400 font-bold tracking-widest uppercase">Generated Study Deck</span>
                <h2 className="text-3xl font-serif text-slate-100 mt-1">{deck.topic}</h2>
              </div>
              <button
                onClick={() => setDeck(null)}
                className="flex items-center space-x-2 text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deck.cards.map((card) => {
                const isFlipped = flippedCards[card.id];
                return (
                  <div
                    key={card.id}
                    onClick={() => toggleFlip(card.id)}
                    className="h-64 cursor-pointer perspective-1000 group"
                  >
                    <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                      {/* Card Front */}
                      <div className="absolute w-full h-full backface-hidden bg-[#0d111a] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl group-hover:border-indigo-500/40 transition-all duration-300">
                        <div>
                          <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full font-medium">
                            {card.category}
                          </span>
                          <h3 className="text-lg font-medium text-slate-100 mt-5 leading-snug">{card.question}</h3>
                        </div>
                        <p className="text-xs text-slate-500 text-right">Click to reveal answer 🔄</p>
                      </div>

                      {/* Card Back */}
                      <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-950/40 border border-indigo-500/40 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
                        <div>
                          <span className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider">Answer</span>
                          <p className="text-sm text-slate-200 mt-3 leading-relaxed">{card.answer}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-indigo-300/80">
                          <span className="flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verified Format</span>
                          </span>
                          <span>Click to flip 🔄</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}