"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechInputStatus =
  | "bereit"
  | "hört zu"
  | "verarbeitet"
  | "fertig"
  | "abgelehnt"
  | "nicht unterstützt"
  | "fehler";

// The Web Speech API has no stable TS lib types across environments, so a
// minimal local shape is declared here rather than depending on lib.dom
// happening to include it — this hook works purely through feature
// detection at runtime regardless.
interface MinimalSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}
interface MinimalSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: MinimalSpeechRecognitionResult;
}
interface MinimalSpeechRecognitionEvent {
  resultIndex: number;
  results: MinimalSpeechRecognitionResultList;
}
interface MinimalSpeechRecognitionErrorEvent {
  error: string;
}
interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: MinimalSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => MinimalSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** German (de-DE) speech-to-text for the "Schnell eintragen" mic button —
 * a thin, defensively-typed wrapper around the browser's native Web Speech
 * API. Falls back to `status: "nicht unterstützt"` wherever that API is
 * absent (Firefox, most non-Chromium browsers) so callers always have a
 * working text-input path regardless. */
export function useSpeechInput(onTranscript: (text: string, isFinal: boolean) => void) {
  const [status, setStatus] = useState<SpeechInputStatus>("bereit");
  // Optimistic default avoids an SSR/client render mismatch; corrected
  // right after mount, once `window` is actually available to check.
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus("nicht unterstützt");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "de-DE";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setStatus("hört zu");
    recognition.onspeechend = () => setStatus("verarbeitet");
    recognition.onresult = (event) => {
      // Re-reads the whole session's results (not just event.resultIndex
      // onward) so callers always get one monotonically-growing transcript
      // for the current recording, rather than having to stitch chunks.
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      onTranscriptRef.current(`${final} ${interim}`.trim(), interim.length === 0);
    };
    recognition.onerror = (event) => {
      setStatus(event.error === "not-allowed" || event.error === "service-not-allowed" ? "abgelehnt" : "fehler");
    };
    recognition.onend = () => {
      setStatus((current) => (current === "abgelehnt" || current === "fehler" ? current : "fertig"));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStatus("fehler");
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    recognitionRef.current?.abort();
    setStatus("bereit");
  }, []);

  const reset = useCallback(() => setStatus("bereit"), []);

  return { status, supported, start, stop, cancel, reset };
}
