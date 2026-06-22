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

export function useVoice({ onTranscript, onSpeakEnd }: VoiceOptions) {
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const conversationActiveRef = useRef(false);
  const voiceModeRef = useRef<VoiceMode>("idle");
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false); // NEW: track thinking state
  const selectedVoiceRef = useRef(VOICE_OPTIONS[0]);
  const gotResultRef = useRef(false);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
    isSpeakingRef.current = voiceMode === "speaking";
    isThinkingRef.current = voiceMode === "thinking"; // NEW
  }, [voiceMode]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setIsSupported(supported);
      synthRef.current = window.speechSynthesis;
      const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getBestVoice = useCallback((voiceOption: typeof VOICE_OPTIONS[0], voices: SpeechSynthesisVoice[]) => {
    if (!voices.length) return null;
    const nameMap: Record<string, string[]> = {
      aria: ["Microsoft Aria", "Aria Online", "Aria"],
      jenny: ["Microsoft Jenny", "Jenny Online", "Jenny"],
      guy: ["Microsoft Guy", "Guy Online", "Guy"],
    };
    const preferred = nameMap[voiceOption.id] || [];
    for (const name of preferred) {
      const found = voices.find(v => v.name.includes(name));
      if (found) return found;
    }
    if (voiceOption.gender === "female") {
      return voices.find(v => v.name.includes("Samantha")) ||
        voices.find(v => v.name.includes("Google US English")) ||
        voices.find(v => v.name.toLowerCase().includes("female")) ||
        voices.find(v => v.lang === "en-US") ||
        voices[0];
    }
    return voices.find(v => v.name.includes("Alex")) ||
      voices.find(v => v.name.includes("Daniel")) ||
      voices.find(v => v.name.toLowerCase().includes("male")) ||
      voices.find(v => v.lang === "en-US") ||
      voices[0];
  }, []);

  const stopAllRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    isSpeakingRef.current = false;
    setVoiceMode("idle");
  }, []);

  const startMainListening = useCallback(() => {
    if (!isSupported) return;
    // Don't start listening if speaking OR thinking
    if (isSpeakingRef.current) return;
    if (isThinkingRef.current) return; // NEW: don't restart during thinking

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
          // Set thinking — this prevents restart loop via isThinkingRef
          setVoiceMode("thinking");
          isThinkingRef.current = true;
          onTranscript(transcript);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "aborted") return;
      if (e.error === "no-speech") {
        // Only restart on no-speech if not thinking and not speaking
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
      // Only restart if conversation active, no result yet,
      // not speaking, not thinking, still in listening mode
      if (
        conversationActiveRef.current &&
        !gotResultRef.current &&
        !isSpeakingRef.current &&
        !isThinkingRef.current && // NEW: don't restart during thinking
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
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const voices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(voiceOption.greeting);
    const voice = getBestVoice(voiceOption, voices);
    if (voice) utterance.voice = voice;
    utterance.pitch = voiceOption.pitch;
    utterance.rate = voiceOption.rate;
    utterance.volume = 1;
    utterance.lang = voiceOption.lang;
    synthRef.current.speak(utterance);
  }, [getBestVoice]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;

    // Stop recognition before speaking
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    synthRef.current.cancel();
    isThinkingRef.current = false; // Clear thinking when speak starts

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

    const currentVoice = selectedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getBestVoice(currentVoice, voices);
    if (voice) utterance.voice = voice;
    utterance.pitch = currentVoice.pitch;
    utterance.rate = currentVoice.rate;
    utterance.volume = 1;
    utterance.lang = currentVoice.lang;

    utterance.onstart = () => {
      setVoiceMode("speaking");
      isSpeakingRef.current = true;
      isThinkingRef.current = false;
    };

    utterance.onend = () => {
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

    utterance.onerror = (e) => {
      if (e.error === "interrupted") return;
      console.error("Speech error:", e.error);
      isSpeakingRef.current = false;
      isThinkingRef.current = false;
      if (conversationActiveRef.current) {
        setVoiceMode("listening");
        setTimeout(() => startMainListening(), 400);
      } else {
        setVoiceMode("idle");
      }
    };

    synthRef.current.speak(utterance);
  }, [getBestVoice, onSpeakEnd, startMainListening]);

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
      if (synthRef.current) synthRef.current.cancel();
      isSpeakingRef.current = false;
      isThinkingRef.current = false;
      setVoiceMode("listening");
      setTimeout(() => startMainListening(), 300);
    } else {
      startMainListening();
    }
  }, [startMainListening, stopListening]);

  const interrupt = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
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
    if (synthRef.current) synthRef.current.cancel();
    stopAllRecognition();
    setVoiceMode("idle");
  }, [stopAllRecognition]);

  return {
    voiceMode, isSupported, selectedVoice, setSelectedVoice,
    voiceOptions: VOICE_OPTIONS, speak, stopSpeaking, previewVoice,
    toggleMic, interrupt, startConversation, endConversation,
    isConversationMode: conversationActiveRef.current,
  };
}