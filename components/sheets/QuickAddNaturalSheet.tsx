"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic, Square, Sparkles, TriangleAlert } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/FormControls";
import { useSpeechInput, type SpeechInputStatus } from "@/lib/hooks/useSpeechInput";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useSheet } from "@/lib/store/sheet-context";
import { parseEventTextLocally } from "@/lib/nlp/parseEventText";

const EXAMPLE =
  "Freitag um 9 Uhr kommt der Tiefbauer auf die Baustelle. Elisabeth erinnern und einen Tag vorher Unterlagen bereitlegen.";

const STATUS_TEXT: Partial<Record<SpeechInputStatus, string>> = {
  "hört zu": "Hört zu …",
  verarbeitet: "Verarbeitet …",
  abgelehnt: "Mikrofonzugriff abgelehnt — bitte tippen.",
  "nicht unterstützt": "Spracheingabe wird auf diesem Gerät nicht unterstützt — bitte tippen.",
  fehler: "Bei der Spracherkennung ist ein Fehler aufgetreten — bitte tippen.",
};

export function QuickAddNaturalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openNaturalPreview } = useSheet();
  const reducedMotion = useReducedMotion();
  const [text, setText] = useState("");
  const baseTextRef = useRef("");

  const handleTranscript = useCallback((sessionText: string) => {
    setText(baseTextRef.current ? `${baseTextRef.current} ${sessionText}`.trim() : sessionText);
  }, []);

  const { status, supported, start, stop, cancel, reset } = useSpeechInput(handleTranscript);
  const listening = status === "hört zu" || status === "verarbeitet";
  const effectiveStatus: SpeechInputStatus = !supported && status === "bereit" ? "nicht unterstützt" : status;

  function handleMicClick() {
    if (listening) {
      stop();
      return;
    }
    baseTextRef.current = text;
    start();
  }

  function handleCancelRecording() {
    cancel();
    setText(baseTextRef.current);
  }

  function handleClose() {
    cancel();
    setText("");
    reset();
    onClose();
  }

  function handleRecognize() {
    if (!text.trim()) return;
    const draft = parseEventTextLocally(text.trim());
    setText("");
    reset();
    openNaturalPreview(draft);
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Schnell eintragen">
      <div className="flex flex-col gap-3">
        <TextAreaField
          autoFocus
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          className="text-[15px]"
        />

        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={handleMicClick}
            aria-label={listening ? "Aufnahme stoppen" : "Spracheingabe starten"}
            disabled={effectiveStatus === "nicht unterstützt"}
            animate={
              listening && !reducedMotion
                ? { scale: [1, 1.07, 1] }
                : { scale: 1 }
            }
            transition={
              listening && !reducedMotion
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.15 }
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border disabled:opacity-40"
            style={{
              borderColor: listening ? "var(--dl-together)" : "var(--dl-border-strong)",
              background: listening ? "var(--dl-together-soft)" : "var(--dl-card)",
            }}
          >
            {listening ? (
              <Square size={17} style={{ color: "var(--dl-together)" }} fill="var(--dl-together)" />
            ) : (
              <Mic size={19} style={{ color: "var(--dl-text)" }} />
            )}
          </motion.button>

          <div className="min-w-0 flex-1">
            {STATUS_TEXT[effectiveStatus] ? (
              <p
                className="flex items-center gap-1.5 text-[12.5px]"
                style={{
                  color:
                    effectiveStatus === "abgelehnt" || effectiveStatus === "fehler" || effectiveStatus === "nicht unterstützt"
                      ? "var(--dl-text-dim)"
                      : "var(--dl-together)",
                }}
              >
                {(effectiveStatus === "abgelehnt" || effectiveStatus === "fehler" || effectiveStatus === "nicht unterstützt") && (
                  <TriangleAlert size={13} className="shrink-0" />
                )}
                {STATUS_TEXT[effectiveStatus]}
              </p>
            ) : (
              <p className="text-[12.5px]" style={{ color: "var(--dl-text-faint)" }}>
                Tippen oder sprechen, z. B.: „{EXAMPLE}“
              </p>
            )}
          </div>

          {listening && (
            <button
              type="button"
              onClick={handleCancelRecording}
              className="shrink-0 text-[12.5px] font-medium"
              style={{ color: "var(--dl-text-dim)" }}
            >
              Abbrechen
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleRecognize}
          disabled={!text.trim()}
          className="mt-1 flex min-h-[48px] items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, var(--dl-domenico), var(--dl-elisabeth))",
            color: "var(--dl-bg)",
          }}
        >
          <Sparkles size={17} /> Termin erkennen
        </button>
      </div>
    </BottomSheet>
  );
}
