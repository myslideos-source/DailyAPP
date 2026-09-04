"use client";

import { AnimatePresence, motion } from "motion/react";
import { useAppStore } from "@/lib/store/app-store";

export function ToastStack() {
  const { toasts } = useAppStore();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(var(--dl-safe-bottom) + 86px)" }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md"
            style={{
              background: "rgba(33, 23, 36, 0.92)",
              borderColor: "var(--dl-border-strong)",
              color: "var(--dl-text)",
            }}
            role="status"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
