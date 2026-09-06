"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Bell, MoreHorizontal } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { PersonAvatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { LogoAmbientGlow } from "@/components/brand/LogoAmbientGlow";
import { NotificationsPopover } from "@/components/notifications/NotificationsPopover";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

function bellBadgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export function Header() {
  const { notifications } = useAppStore();
  const reducedMotion = useReducedMotion();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const count = notifications.length;

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
          className="relative h-10 w-[100px]"
        >
          <LogoAmbientGlow />
          <Image
            src="/brand/logo.png"
            alt="dayli"
            fill
            priority
            sizes="100px"
            className="object-contain object-left"
          />
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <PersonAvatar assignee="domenico" size="sm" />
            <PersonAvatar assignee="elisabeth" size="sm" />
          </div>
          <IconButton
            ref={bellRef}
            label="Benachrichtigungen"
            onClick={() => setPopoverOpen((v) => !v)}
            className="relative"
          >
            <Bell size={19} strokeWidth={1.8} />
            {count > 0 && (
              <span
                className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] font-bold leading-none"
                style={{ background: "var(--dl-elisabeth)", color: "var(--dl-bg)" }}
              >
                {bellBadgeLabel(count)}
              </span>
            )}
          </IconButton>
          <NotificationsPopover open={popoverOpen} onClose={() => setPopoverOpen(false)} anchorRef={bellRef} />
          {/* The Dayli Dock only carries Heute/Kalender/Aufgaben — Mehr
              (Profil, Sparziele, Backup, Einstellungen …) needs its own
              entry point on mobile; desktop already has it in the sidebar. */}
          <Link
            href="/mehr"
            aria-label="Mehr öffnen"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--dl-text)] transition-colors hover:bg-white/5 md:hidden"
          >
            <MoreHorizontal size={19} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
}
