"use client";

import { useSyncExternalStore } from "react";
import { getChatLog, getServerSnapshot } from "@/lib/chat-log";

/**
 * YouTube-style live-chat overlay for fullscreen viewing. Reads the same
 * per-room message store the chat panel writes to, so messages appear here in
 * real time. Display-only (pointer-events-none) so it never blocks the player.
 */
export function ChatOverlay({ room }: { room: string }) {
  const log = getChatLog(room);
  const messages = useSyncExternalStore(
    log.subscribe,
    log.getSnapshot,
    getServerSnapshot,
  );
  const recent = messages.slice(-6);
  if (recent.length === 0) return null;

  return (
    <div className="pointer-events-none absolute right-3 bottom-3 z-10 flex max-w-[min(85%,22rem)] flex-col items-end gap-1.5">
      {recent.map((m) => (
        <div
          key={m.id}
          className="w-fit border-l-2 border-teletext-cyan bg-black/70 px-2.5 py-1 text-xs leading-snug break-words text-white backdrop-blur-sm"
        >
          <span className="font-display mr-1.5 tracking-wider text-teletext-yellow">
            {m.user.toUpperCase()}
          </span>
          <span className="text-white/90">{m.text}</span>
        </div>
      ))}
    </div>
  );
}
