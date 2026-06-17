"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import PusherClient from "pusher-js";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHAT_EVENT, chatChannel } from "@/lib/chat-shared";
import { getChatLog, getServerSnapshot } from "@/lib/chat-log";
import type { ChatMessage } from "@/lib/types";

const NAME_KEY = "fifa26-chat-user";
const NAME_EVENT = "fifa26-chat-name"; // same-tab notifier (storage event is cross-tab only)
const NOTIFY_KEY = "fifa26-chat-notify"; // remembers the per-user alert opt-in
const SEND_COOLDOWN_MS = 1000; // light anti-spam: ~1 msg/sec per client

type Perm = NotificationPermission | "unsupported";

/** Current browser notification permission, or "unsupported". Client-only. */
function readPermission(): Perm {
  if (typeof window === "undefined" || !("Notification" in window))
    return "unsupported";
  return Notification.permission;
}
function readNotifyPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(NOTIFY_KEY) === "1";
  } catch {
    return false;
  }
}
function writeNotifyPref(on: boolean): void {
  try {
    localStorage.setItem(NOTIFY_KEY, on ? "1" : "0");
  } catch {
    /* storage disabled — preference just won't persist */
  }
}

/**
 * localStorage-backed username store. Read through useSyncExternalStore so the
 * value is correct after hydration (server snapshot is null → renders the name
 * prompt) and updates when the name is set, here or in another tab.
 */
function subscribeName(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(NAME_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(NAME_EVENT, cb);
  };
}
function getName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY)?.trim() || null;
  } catch {
    return null;
  }
}
function setStoredName(value: string): void {
  try {
    localStorage.setItem(NAME_KEY, value);
  } catch {
    /* localStorage unavailable — name still applies for this session via the event */
  }
  window.dispatchEvent(new Event(NAME_EVENT));
}

/**
 * Per-room live chat over a Pusher presence channel. The wire is ephemeral
 * (Pusher replays nothing), but the last 50 messages are kept in localStorage
 * via getChatLog so a refresh restores the recent conversation. First-time
 * visitors are asked to pick a (non-blank) handle before they can join.
 */
export function ChatPanel({ room }: { room: string }) {
  const name = useSyncExternalStore(subscribeName, getName, () => null);
  const log = getChatLog(room);
  const messages = useSyncExternalStore(
    log.subscribe,
    log.getSnapshot,
    getServerSnapshot,
  );
  const [members, setMembers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState("");
  // Lazy reads are safe: this connected view only renders on the client (the
  // server snapshot for `name` is null → server renders the name prompt).
  const [perm, setPerm] = useState<Perm>(readPermission);
  const [notify, setNotify] = useState<boolean>(readNotifyPref);
  const lastSentRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  // Mirror the alert toggle into a ref so the Pusher handler reads the latest
  // value without the subscribe effect depending on it (which would reconnect).
  const notifyRef = useRef(false);

  const notifyOn = notify && perm === "granted";
  useEffect(() => {
    notifyRef.current = notifyOn;
  }, [notifyOn]);

  // Connect to Pusher and join this room's presence channel once we have a name.
  useEffect(() => {
    if (!name) return;
    const channelName = chatChannel(room);
    let pusher: PusherClient | null = null;
    let cancelled = false;

    (async () => {
      const res = await fetch("/api/chat");
      const cfg = (await res.json()) as {
        configured?: boolean;
        key?: string;
        cluster?: string;
      };
      if (cancelled || !cfg.configured || !cfg.key || !cfg.cluster) return;

      pusher = new PusherClient(cfg.key, {
        cluster: cfg.cluster,
        channelAuthorization: {
          endpoint: "/api/chat/auth",
          transport: "ajax",
          params: { user: name },
        },
      });
      pusher.connection.bind("connected", () => setConnected(true));
      pusher.connection.bind("disconnected", () => setConnected(false));
      pusher.connection.bind("unavailable", () => setConnected(false));

      const channel = pusher.subscribe(channelName);

      // Presence roster — recompute the name list from the live member set.
      // `members` only exists on presence channels; cast to a minimal shape.
      type Member = { info?: { name?: string } };
      const roster = channel as unknown as {
        members: { each: (cb: (m: Member) => void) => void };
      };
      const refresh = () => {
        const names: string[] = [];
        roster.members.each((m) => names.push(m.info?.name ?? "anon"));
        setMembers(names);
      };
      channel.bind("pusher:subscription_succeeded", refresh);
      channel.bind("pusher:member_added", refresh);
      channel.bind("pusher:member_removed", refresh);

      channel.bind(CHAT_EVENT, (data: ChatMessage) => {
        getChatLog(room).append(data);

        // Notify only for others' messages, only when this tab isn't being
        // looked at (another tab, or the window isn't focused).
        const away = document.hidden || !document.hasFocus();
        if (
          notifyRef.current &&
          data.user !== name &&
          away &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            const note = new Notification(`${data.user.toUpperCase()} · MATCH CHAT`, {
              body: data.text,
              icon: "/favicon.ico",
              tag: `fifa26-chat-${room}`, // collapse to one per room
            });
            note.onclick = () => {
              window.focus();
              note.close();
            };
          } catch {
            /* some browsers throw if construction is disallowed — ignore */
          }
        }
      });
    })();

    return () => {
      cancelled = true;
      if (pusher) {
        pusher.unsubscribe(channelName);
        pusher.disconnect();
      }
      setConnected(false);
      setMembers([]);
    };
  }, [name, room]);

  // Keep the log pinned to the newest message.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setStoredName(value.slice(0, 32));
    setDraft("");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !name) return;

    const now = Date.now();
    if (now - lastSentRef.current < SEND_COOLDOWN_MS) return;
    lastSentRef.current = now;

    setDraft("");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, user: name, text }),
    });
    // No optimistic insert — the message arrives via the Pusher broadcast.
  }

  // Toggle background message alerts; requesting permission on first enable.
  async function toggleNotify() {
    if (!("Notification" in window)) return;
    if (notify) {
      setNotify(false);
      writeNotifyPref(false);
      return;
    }
    let p: NotificationPermission = Notification.permission;
    if (p === "default") p = await Notification.requestPermission();
    setPerm(p);
    const on = p === "granted";
    setNotify(on);
    writeNotifyPref(on);
  }

  // First visit: ask for a (non-empty) display name before joining.
  if (!name) {
    return (
      <section className="border-2 border-foreground">
        <div className="font-display glow-cyan border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
          ▓ MATCH CHAT
        </div>
        <form onSubmit={saveName} className="space-y-3 p-4">
          <p className="text-[11px] tracking-[0.3em] text-teletext-amber">
            ▌PICK A HANDLE TO JOIN THE CHAT
          </p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={32}
            autoFocus
            placeholder="YOUR NAME"
            className="font-display w-full border-2 border-teletext-cyan/40 bg-background px-3 py-2 text-xs tracking-wider text-teletext-cyan placeholder:text-muted-foreground focus:border-teletext-yellow focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="pixel-press font-display border-2 border-teletext-yellow bg-teletext-yellow px-3 py-1.5 text-[8px] tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            ENTER CHAT
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="border-2 border-foreground">
      <div className="font-display glow-cyan flex items-center justify-between gap-2 border-b-2 border-foreground bg-card/40 px-4 py-3 text-[11px] tracking-wide text-teletext-cyan sm:text-xs">
        <span className="min-w-0 truncate">▓ MATCH CHAT</span>
        <span className="flex shrink-0 items-center gap-2.5">
          {perm !== "unsupported" && (
            <button
              type="button"
              onClick={toggleNotify}
              aria-pressed={notifyOn}
              title={
                perm === "denied"
                  ? "Alerts blocked — enable notifications in your browser settings"
                  : notifyOn
                    ? "Mute new-message alerts"
                    : "Alert me on new messages when this tab is in the background"
              }
              className={cn(
                "pixel-press flex items-center border-2 p-1 transition-colors",
                notifyOn
                  ? "border-teletext-yellow text-teletext-yellow"
                  : "border-teletext-cyan/40 text-teletext-cyan/70 hover:border-teletext-yellow hover:text-teletext-yellow",
              )}
            >
              {notifyOn ? (
                <Bell className="h-3 w-3" />
              ) : (
                <BellOff className="h-3 w-3" />
              )}
            </button>
          )}
          <span className="flex items-center gap-2 whitespace-nowrap text-teletext-green">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 shrink-0",
                connected
                  ? "animate-blink bg-teletext-green"
                  : "bg-teletext-amber",
              )}
            />
            {connected ? `${members.length} ONLINE` : "CONNECTING…"}
          </span>
        </span>
      </div>

      {members.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 border-b-2 border-foreground bg-card/20 px-4 py-2 text-[10px] tracking-wider text-muted-foreground">
          <span className="shrink-0 text-teletext-amber">▌ONLINE</span>
          {members.map((m, i) => (
            <span
              key={`${m}-${i}`}
              className={cn(
                "max-w-full truncate",
                m === name ? "text-teletext-yellow" : "text-teletext-cyan",
              )}
            >
              {m.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      <div
        ref={logRef}
        className="h-72 space-y-2 overflow-y-auto p-4 text-xs leading-relaxed"
      >
        {messages.length === 0 ? (
          <p className="tracking-wider text-muted-foreground">
            ░ NO MESSAGES YET — SAY SOMETHING
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="break-words">
              <span
                className={cn(
                  "font-display tracking-wider",
                  m.user === name
                    ? "text-teletext-yellow"
                    : "text-teletext-cyan",
                )}
              >
                {m.user.toUpperCase()}
              </span>
              <span className="text-muted-foreground"> › </span>
              <span className="text-foreground">{m.text}</span>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={send}
        className="flex gap-1.5 border-t-2 border-foreground bg-card/40 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder={`MESSAGE AS ${name.toUpperCase()}`}
          className="font-display min-w-0 flex-1 border-2 border-teletext-cyan/40 bg-background px-3 py-2 text-xs tracking-wider text-foreground placeholder:text-muted-foreground focus:border-teletext-yellow focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="pixel-press font-display shrink-0 border-2 border-teletext-yellow bg-teletext-yellow px-3 py-1.5 text-[8px] tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-40"
        >
          SEND
        </button>
      </form>
    </section>
  );
}
