"use client";
import { useState, useRef, useEffect, useCallback } from "react";

export type VoiceMode = "idle" | "listening" | "speaking" | "thinking";

export interface VoiceOptions {
  onTranscript: (text: string) => void;
  onSpeakEnd: () => void;
}

export const VOICE_OPTIONS = [
  { id: "aria", name: "Aria", description: "Warm & friendly", lang: "en-US", gender: "female", pitch: 1.05, rate: 0.95, greeting: "Hi! I'm Aria, warm and friendly. How can I help you today?" },
  { id: "jenny", name: "Jenny", description: "Clear & professional", lang: "en-US", gender: "female", pitch: 1.0, rate: 1.0, greeting: "Hello! I'm Jenny, clear and professional. Ready to assist!" },
  { id: "guy", name: "Guy", description: "Deep & confident", lang: "en-US", gender: "male", pitch: 0.85, rate: 0.92, greeting: "Hey! I'm Guy, deep and confident. What can I do for you?" },
];

const API = process.env.NEXT_PUBLIC_API_URL;

export function useVoice({ onTranscript, onSpeakEnd }: VoiceOptions) {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationActiveRef = useRef(false);
  const voiceModeRef = useRef<VoiceMode>("idle");
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false);
  const selectedVoiceRef = useRef(VOICE_OPTIONS[0]);
  const gotResultRef = useRef(false);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
    isSpeakingRef.current = voiceMode === "speaking";
    isThinkingRef.current = voiceMode === "thinking";
  }, [voiceMode]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsSupported(supported);
      // load browser voices for fallback only
      const loadVoices = () => setAvailableVoices(window.speechSynthesis?.getVoices() || []);
      loadVoices();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const stopAllRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
    setVoiceMode("idle");
  }, []);

  const startMainListening = useCallback(() => {
    if (!isSupported) return;
    if (isSpeakingRef.current) return;
    if (isThinkingRef.current) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    gotResultRef.current = false;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceMode("listening");

    recognition.onresult = (event: any) => {
      const results = event.results;
      const last = results[results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) {
          gotResultRef.current = true;
          setVoiceMode("thinking");
          isThinkingRef.current = true;
          onTranscript(transcript);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "aborted") return;
      if (e.error === "no-speech") {
        if (conversationActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          setTimeout(() => startMainListening(), 300);
        }
        return;
      }
      if (e.error === "network") {
        if (conversationActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          setTimeout(() => startMainListening(), 1500);
        }
        return;
      }
      console.error("Recognition error:", e.error);
      if (conversationActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
        setTimeout(() => startMainListening(), 1000);
      }
    };

    recognition.onend = () => {
      if (
        conversationActiveRef.current &&
        !gotResultRef.current &&
        !isSpeakingRef.current &&
        !isThinkingRef.current &&
        voiceModeRef.current === "listening"
      ) {
        setTimeout(() => startMainListening(), 300);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      if (conversationActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
        setTimeout(() => startMainListening(), 500);
      }
    }
  }, [isSupported, onTranscript]);

  const previewVoice = useCallback((voiceOption: typeof VOICE_OPTIONS[0]) => {
    // preview uses ElevenLabs too
    speak(voiceOption.greeting);
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    // stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    isThinkingRef.current = false;

    const cleanText = text
      .replace(/\*\*/g, "").replace(/\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/`/g, "").replace(/Sources:/g, "")
      .replace(/\n/g, " ").trim();

    if (!cleanText) {
      if (conversationActiveRef.current) {
        isThinkingRef.current = false;
        setVoiceMode("listening");
        setTimeout(() => startMainListening(), 300);
      }
      return;
    }

    // safety timeout
    const safetyTimer = setTimeout(() => {
      if (isSpeakingRef.current) {
        console.warn("Speech safety timeout");
        isSpeakingRef.current = false;
        isThinkingRef.current = false;
        if (conversationActiveRef.current) {
          setVoiceMode("listening");
          setTimeout(() => startMainListening(), 400);
        } else {
          setVoiceMode("idle");
        }
      }
    }, 60000);

    setVoiceMode("speaking");
    isSpeakingRef.current = true;

    // call ElevenLabs via backend
    fetch(`${API}/api/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          clearTimeout(safetyTimer);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          isSpeakingRef.current = false;
          isThinkingRef.current = false;
          onSpeakEnd();
          if (onEnd) onEnd();
          if (conversationActiveRef.current) {
            setVoiceMode("listening");
            setTimeout(() => startMainListening(), 400);
          } else {
            setVoiceMode("idle");
          }
        };

        audio.onerror = () => {
          clearTimeout(safetyTimer);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          isSpeakingRef.current = false;
          isThinkingRef.current = false;
          if (conversationActiveRef.current) {
            setVoiceMode("listening");
            setTimeout(() => startMainListening(), 400);
          } else {
            setVoiceMode("idle");
          }
        };

        audio.play().catch((err) => {
          console.error("Audio play error:", err);
          clearTimeout(safetyTimer);
          isSpeakingRef.current = false;
          isThinkingRef.current = false;
          if (conversationActiveRef.current) {
            setVoiceMode("listening");
            setTimeout(() => startMainListening(), 400);
          } else {
            setVoiceMode("idle");
          }
        });
      })
      .catch((err) => {
        console.error("ElevenLabs TTS error:", err);
        clearTimeout(safetyTimer);
        isSpeakingRef.current = false;
        isThinkingRef.current = false;
        if (conversationActiveRef.current) {
          setVoiceMode("listening");
          setTimeout(() => startMainListening(), 400);
        } else {
          setVoiceMode("idle");
        }
      });

  }, [onSpeakEnd, startMainListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setVoiceMode("idle");
  }, []);

  const toggleMic = useCallback(() => {
    if (voiceModeRef.current === "listening") {
      stopListening();
    } else if (voiceModeRef.current === "speaking") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isSpeakingRef.current = false;
      isThinkingRef.current = false;
      setVoiceMode("listening");
      setTimeout(() => startMainListening(), 300);
    } else {
      startMainListening();
    }
  }, [startMainListening, stopListening]);

  const interrupt = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
    isThinkingRef.current = false;
    setVoiceMode("listening");
    setTimeout(() => startMainListening(), 300);
  }, [startMainListening]);

  const startConversation = useCallback(() => {
    conversationActiveRef.current = true;
    isThinkingRef.current = false;
    startMainListening();
  }, [startMainListening]);

  const endConversation = useCallback(() => {
    conversationActiveRef.current = false;
    isSpeakingRef.current = false;
    isThinkingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopAllRecognition();
    setVoiceMode("idle");
  }, [stopAllRecognition]);

  const getBestVoice = useCallback((voiceOption: typeof VOICE_OPTIONS[0], voices: SpeechSynthesisVoice[]) => {
    return voices[0] || null;
  }, []);

  return {
    voiceMode, isSupported, selectedVoice, setSelectedVoice,
    voiceOptions: VOICE_OPTIONS, speak, stopSpeaking, previewVoice,
    toggleMic, interrupt, startConversation, endConversation,
    isConversationMode: conversationActiveRef.current,
    availableVoices, getBestVoice,
  };
}