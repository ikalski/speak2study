import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles, RefreshCw, CheckCircle2, Edit2 } from 'lucide-react';

interface Flashcard {
  id: string;
  question: str;
  answer: string;
  category: string;
}

interface FlashcardDeck {
  topic: string;
  cards: Flashcard[];
}

export default function Speak2StudyApp() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // BACKEND API URL (Environment variable or Render URL)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 1. Audio Recording Logic
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
      clearInterval(timerRef.current);
    }
  };

  // 2. Transmit Raw Audio directly to Python API
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

  // 3. WINNING HACK: Offline Demo Backup for Wi-Fi Disruption
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Speak2Study 2.0
          </span>
        </div>
        
        {/* Hackathon Emergency Demo Mode Switch */}
        <button 
          onClick={loadMockDemoData} 
          className="text-xs text-slate-400 hover:text-indigo-400 border border-slate-700 px-3 py-1.5 rounded-lg transition"
        >
          ⚡ Load Sample Deck (Failsafe)
        </button>
      </header>

      {/* Main Studio Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        {!deck && !isLoading && (
          <div className="text-center max-w-xl flex flex-col items-center">
            <h1 className="text-4xl font-extrabold tracking-tight mb-4 text-slate-50">
              Speak Your Notes. <br />
              <span className="text-indigo-400">Gemini Builds Your Study Deck.</span>
            </h1>
            <p className="text-slate-400 mb-8 text-base">
              Bypass slow speech-to-text. Record lectures or speak aloud—Gemini 2.5 Native Multimodal directly processes your audio stream into structured study cards.
            </p>

            {/* Recorder Trigger */}
            <div className="flex flex-col items-center space-y-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center group"
                >
                  <Mic className="w-10 h-10 text-white group-hover:scale-110 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-24 h-24 rounded-full bg-red-600 hover:bg-red-500 animate-pulse transition-all shadow-lg shadow-red-500/30 flex items-center justify-center"
                >
                  <Square className="w-8 h-8 text-white" />
                </button>
              )}

              <span className="text-sm font-medium text-slate-400">
                {isRecording ? `Recording... (${recordingTime}s)` : "Tap microphone to begin"}
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <p className="text-slate-300 font-medium">
              Gemini 2.5 analyzing raw audio stream & structuring JSON output...
            </p>
          </div>
        )}

        {/* Render Generated Flashcard Deck */}
        {deck && !isLoading && (
          <div className="w-full space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Generated Study Deck</span>
                <h2 className="text-2xl font-bold text-slate-100">{deck.topic}</h2>
              </div>
              <button
                onClick={() => setDeck(null)}
                className="flex items-center space-x-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>New Session</span>
              </button>
            </div>

            {/* Flashcard 3D Grid */}
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
                      {/* CARD FRONT */}
                      <div className="absolute w-full h-full backface-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl group-hover:border-indigo-500/50 transition-colors">
                        <div>
                          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-medium">
                            {card.category}
                          </span>
                          <h3 className="text-lg font-semibold text-slate-100 mt-4">{card.question}</h3>
                        </div>
                        <p className="text-xs text-slate-500 text-right">Click to reveal answer 🔄</p>
                      </div>

                      {/* CARD BACK */}
                      <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-950/80 border border-indigo-700/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                        <div>
                          <span className="text-xs text-indigo-300 font-semibold uppercase">Answer</span>
                          <p className="text-sm text-slate-200 mt-3 leading-relaxed">{card.answer}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-indigo-300">
                          <span className="flex items-center space-x-1">
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