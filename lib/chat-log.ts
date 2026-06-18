import type { ChatMessage } from "@/lib/types";

/**
 * Per-room chat history backed by localStorage. The live chat is still
 * ephemeral on the wire (Pusher replays nothing), but we keep a short rolling
 * log so a refresh doesn't wipe the conversation: the last MAX_STORED messages
 * are persisted and restored.
 *
 * Exposed as a useSyncExternalStore-compatible store so the component reads it
 * without a load-in-effect (which would mismatch on hydration and trip the
 * set-state-in-effect lint). getServerSnapshot returns a stable empty array, so
 * SSR/hydration render empty and the stored log appears right after.
 */

const STORAGE_PREFIX = "fifa26-chat-log-";
const MAX_STORED = 50; // persisted + restored across refreshes
const MAX_MEMORY = 100; // kept in memory during a single session

// Stable empty reference — required so getSnapshot/getServerSnapshot don't
// signal a change on every call (which would loop useSyncExternalStore).
const EMPTY: readonly ChatMessage[] = Object.freeze([]);

type Listener = () => void;

function storageKey(room: string): string {
  return `${STORAGE_PREFIX}${room}`;
}

function isMessage(x: unknown): x is ChatMessage {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.user === "string" &&
    typeof m.text === "string" &&
    typeof m.ts === "number"
  );
}

function load(room: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(room));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMessage).slice(-MAX_STORED);
  } catch {
    return [];
  }
}

function persist(room: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(room),
      JSON.stringify(messages.slice(-MAX_STORED)),
    );
  } catch {
    /* quota exceeded / storage disabled — session continues in memory only */
  }
}

class ChatLog {
  private messages: ChatMessage[];
  private listeners = new Set<Listener>();

  constructor(private readonly room: string) {
    this.messages = load(room);
  }

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  // Returns a stable reference between changes so React doesn't re-render in a loop.
  getSnapshot = (): readonly ChatMessage[] => {
    return this.messages.length ? this.messages : EMPTY;
  };

  append = (msg: ChatMessage): void => {
    if (this.messages.some((m) => m.id === msg.id)) return; // de-dupe redeliveries
    this.messages = [...this.messages, msg].slice(-MAX_MEMORY);
    persist(this.room, this.messages);
    this.emit();
  };

  // Clears this client's local history. Chat is ephemeral on the wire, so this
  // only affects the local view — it doesn't wipe anyone else's log.
  clear = (): void => {
    if (!this.messages.length) return;
    this.messages = [];
    persist(this.room, this.messages);
    this.emit();
  };

  private emit(): void {
    this.listeners.forEach((l) => l());
  }
}

const logs = new Map<string, ChatLog>();

/** Returns the (memoized) message store for a room — stable across renders. */
export function getChatLog(room: string): ChatLog {
  let log = logs.get(room);
  if (!log) {
    log = new ChatLog(room);
    logs.set(room, log);
  }
  return log;
}

/** Stable empty snapshot for SSR / first hydration render. */
export function getServerSnapshot(): readonly ChatMessage[] {
  return EMPTY;
}
