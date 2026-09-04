"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { PersonAvatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

export function Header({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const { notifications } = useAppStore();
  const reducedMotion = useReducedMotion();
  const unread = notifications.some((n) => !n.read);

  return (
    <header
      className="sticky top-0 z-40 pt-safe-header"
      style={{
        background:
          "linear-gradient(180deg, var(--dl-bg) 72%, rgba(8,10,19,0))",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 pb-3">
        <motion.div
          layoutId={reducedMotion ? undefined : "dayli-logo"}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          className="relative h-7 w-[68px]"
        >
          <Image
            src="/brand/logo.png"
            alt="dayli"
            fill
            priority
            sizes="68px"
            className="object-contain object-left"
          />
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <PersonAvatar assignee="domenico" size="sm" />
            <PersonAvatar assignee="elisabeth" size="sm" />
          </div>
          <IconButton label="Benachrichtigungen" onClick={onOpenNotifications} className="relative">
            <Bell size={19} strokeWidth={1.8} />
            {unread && (
              <span
                className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--dl-elisabeth)" }}
              />
            )}
          </IconButton>
        </div>
      </div>
    </header>
  );
}
