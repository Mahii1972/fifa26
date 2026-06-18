"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StreamPlayer } from "@/components/live/stream-player";
import { ChatPanel } from "@/components/live/chat-panel";
import { LightsOutToggle } from "@/components/retro/lights-out-toggle";
import { cn } from "@/lib/utils";
import type { SyncPayload } from "@/lib/watch-party";
import type { LiveStream } from "@/lib/types";

const CHAT_NAME_KEY = "fifa26-chat-user"; // ChatPanel's handle, reused as host label
const HOST_STALE_MS = 30_000; // host considered gone if silent this long
const DRIFT_NUDGE = 10; // seconds of drift before we suggest catching up
const HEARTBEAT_MS = 10_000; // host re-announces this often (covers paused state)

/** Seconds → "M:SS" / "H:MM:SS". */
function fmtTime(s: number): string {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/**
 * The interactive shell of a watch-party room: header (guarded BACK), the player
 * + chat grid, the party lifecycle, and the soft playback-sync bar.
 *
 * Presence (who's here) comes from ChatPanel's roster — a single Pusher
 * subscription, so the count stays honest. Sync: the embed relays PLAYER_EVENT
 * up to this window; the current host fans its state out over the room channel
 * tagged with a per-tab id, so exactly one controller is in effect. Anyone can
 * TAKE CONTROL — the newest claim wins (deterministic tie-break by id). The
 * embed accepts no commands, so this is an indicator + catch-up hint, not
 * enforced play/pause.
 */
export function WatchPartyRoom({
  slug,
  title,
  streams,
}: {
  slug: string;
  title: string;
  streams: LiveStream[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state.
  const [hostState, setHostState] = useState<SyncPayload | null>(null);
  const [myProgress, setMyProgress] = useState(0);
  const [now, setNow] = useState(0); // ticking clock for host-staleness (no Date.now() in render)
  const [iAmHost, setIAmHost] = useState(false);
  // Transient announcement of the host's last pause / resume / jump.
  const [flash, setFlash] = useState<{
    text: string;
    tone: "pause" | "play" | "seek";
  } | null>(null);

  const count = members.length;
  const isLast = count === 1;

  // Per-tab id (NOT localStorage — two tabs of one browser must differ). Set in
  // a mount effect (off the render path), read via ref; only used once someone
  // has taken control, by which point it's populated.
  const clientIdRef = useRef("");
  const iAmHostRef = useRef(false);
  useEffect(() => {
    iAmHostRef.current = iAmHost;
  }, [iAmHost]);
  // Latest local player state, for the host's outgoing announcements.
  const myStatusRef = useRef("playing");
  const myDurationRef = useRef(0);
  const myProgressRef = useRef(0);
  const lastSent = useRef({ status: "", at: 0 });
  const myClaimAtRef = useRef(0); // server time of my latest announcement (for newest-wins)
  const lastHostStatusRef = useRef(""); // (viewer) host's previous status → flash transitions
  const lastChatStatusRef = useRef(""); // (host) my previous status → chat-log transitions
  const lastSeekChatRef = useRef(0); // throttle "jumped to" chat spam while scrubbing
  const flashTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!clientIdRef.current) {
      clientIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `c-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  function postSync(status: string, progress: number, duration: number) {
    let host = "HOST";
    try {
      host = localStorage.getItem(CHAT_NAME_KEY)?.trim() || "HOST";
    } catch {
      /* ignore */
    }
    fetch("/api/party-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: slug,
        status,
        progress,
        duration,
        host,
        hostId: clientIdRef.current,
      }),
    }).catch(() => {
      /* sync is best-effort */
    });
  }

  // Post a host sync event into the room chat (history everyone can scroll).
  function postChat(text: string) {
    let user = "HOST";
    try {
      user = localStorage.getItem(CHAT_NAME_KEY)?.trim() || "HOST";
    } catch {
      /* ignore */
    }
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: slug, user, text }),
    }).catch(() => {
      /* best-effort */
    });
  }

  // Listen for the embedded player's events (it relays PLAYER_EVENT up to us).
  // Track my own state for the drift readout; if I hold control, announce it
  // (immediately on status changes, lightly throttled otherwise).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as
        | { type?: string; data?: Record<string, unknown> }
        | null;
      if (!d || d.type !== "PLAYER_EVENT" || !d.data) return;

      const status = String(d.data.player_status ?? "");
      const progress = Number(d.data.player_progress ?? 0);
      const duration = Number(d.data.player_duration ?? 0);
      if (Number.isFinite(progress)) {
        setMyProgress(progress);
        myProgressRef.current = progress;
      }
      myStatusRef.current = status;
      if (Number.isFinite(duration)) myDurationRef.current = duration;

      if (!iAmHostRef.current) return;

      // Record my pause / resume / jump into chat as it happens.
      const prevChat = lastChatStatusRef.current;
      const isPlay = status === "playing" || status === "play";
      const isPause = status === "paused" || status === "pause";
      let chatText = "";
      if (isPause && prevChat !== "paused") {
        chatText = `⏸ PAUSED AT ${fmtTime(progress)}`;
      } else if (isPlay && prevChat === "paused") {
        chatText = `▶ RESUMED AT ${fmtTime(progress)}`;
      } else if (status === "seeked") {
        const tt = Date.now();
        if (tt - lastSeekChatRef.current > 3000) {
          lastSeekChatRef.current = tt;
          chatText = `⟳ JUMPED TO ${fmtTime(progress)}`;
        }
      }
      lastChatStatusRef.current = isPlay ? "playing" : isPause ? "paused" : status;
      if (chatText) postChat(chatText);

      const t = Date.now();
      const changed = status !== lastSent.current.status;
      if (!changed && t - lastSent.current.at < 4000) return;
      lastSent.current = { status, at: t };
      postSync(status, progress, duration);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // While I hold control, announce immediately and keep a heartbeat so viewers
  // still see me while paused (no player events fire when paused).
  useEffect(() => {
    if (!iAmHost) return;
    const beat = () =>
      postSync(myStatusRef.current || "playing", myProgressRef.current, myDurationRef.current);
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iAmHost]);

  // Apply an incoming host announcement. My own echo records the server time of
  // my claim. If I'm hosting and someone else announced at least as recently
  // (newest wins; id breaks exact-time ties), yield control to them.
  function handleSync(payload: SyncPayload) {
    setHostState(payload);
    if (payload.hostId === clientIdRef.current) {
      myClaimAtRef.current = payload.at;
      return;
    }

    // Flash the host's pause / resume / jump the moment it happens.
    const prev = lastHostStatusRef.current;
    const s = payload.status;
    const isPlay = s === "playing" || s === "play";
    const isPause = s === "paused" || s === "pause";
    const who = payload.host.toUpperCase();
    let evt: { text: string; tone: "pause" | "play" | "seek" } | null = null;
    if (isPause && prev !== "paused") {
      evt = { text: `⏸ ${who} PAUSED AT ${fmtTime(payload.progress)}`, tone: "pause" };
    } else if (isPlay && prev === "paused") {
      evt = { text: `▶ ${who} RESUMED AT ${fmtTime(payload.progress)}`, tone: "play" };
    } else if (s === "seeked") {
      evt = { text: `⟳ ${who} JUMPED TO ${fmtTime(payload.progress)}`, tone: "seek" };
    }
    lastHostStatusRef.current = isPlay ? "playing" : isPause ? "paused" : s;
    if (evt) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlash(evt);
      flashTimerRef.current = window.setTimeout(() => setFlash(null), 5000);
    }

    if (
      iAmHostRef.current &&
      (payload.at > myClaimAtRef.current ||
        (payload.at === myClaimAtRef.current &&
          payload.hostId > clientIdRef.current))
    ) {
      setIAmHost(false);
    }
  }

  // Tick a clock so the bar re-evaluates host staleness without Date.now() in render.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Clear any pending flash timer on unmount.
  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    [],
  );

  // Warn before a tab-close that would end the party (last one here).
  useEffect(() => {
    if (!isLast) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isLast]);

  function handleBack() {
    if (isLast) setConfirmOpen(true);
    else router.push("/");
  }

  function takeControl() {
    myClaimAtRef.current = Date.now(); // optimistic — refined by my own echo
    setIAmHost(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  // If I'm not the controller and a fresh announcement exists, someone else is.
  // (Right after yielding, the last echo may briefly be my own — self-corrects
  // on the next host's heartbeat. clientId can't be read here — refs aren't
  // allowed in render — and isn't needed.)
  const hostFresh = !!hostState && now > 0 && now - hostState.at <= HOST_STALE_MS;
  const someoneElseHosts = !iAmHost && hostFresh;

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b-2 border-foreground px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={handleBack}
          className="font-display pixel-press text-[10px] tracking-wider text-teletext-cyan hover:text-teletext-yellow"
        >
          ◄ BACK
        </button>
        <div className="flex items-center gap-3 sm:gap-4">
          {count > 0 && (
            <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] tracking-widest text-teletext-green">
              <span className="inline-block h-2 w-2 animate-blink bg-teletext-green" />
              {count} WATCHING
            </span>
          )}
          <span className="glow-cyan hidden text-[11px] tracking-[0.3em] text-teletext-cyan sm:inline">
            WATCH PARTY
          </span>
          <LightsOutToggle />
        </div>
      </header>

      <main className="p-3 sm:p-4 md:p-6">
        <header className="pixel-shadow mb-6 border-2 border-foreground bg-secondary/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.3em] text-teletext-cyan">
                ▌WATCH PARTY
              </p>
              <h1 className="font-display glow-yellow mt-3 text-base tracking-tight text-teletext-yellow sm:text-lg">
                {title.toUpperCase()}
              </h1>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="pixel-press font-display shrink-0 border-2 border-teletext-cyan/50 px-3 py-1.5 text-[8px] tracking-wider text-teletext-cyan hover:border-teletext-yellow hover:text-teletext-yellow"
            >
              {copied ? "✓ COPIED" : "⎘ COPY INVITE LINK"}
            </button>
          </div>
          <p className="mt-2 text-[11px] tracking-wider text-muted-foreground">
            SHARE THE LINK SO FRIENDS CAN JOIN · PICK A CHAT HANDLE TO ENTER THE
            PARTY
          </p>
        </header>

        {flash && (
          <div
            className={cn(
              "font-display mb-3 border-2 px-4 py-2.5 text-[11px] tracking-wider",
              flash.tone === "pause" &&
                "border-teletext-amber/70 bg-teletext-amber/15 text-teletext-amber",
              flash.tone === "play" &&
                "border-teletext-green/70 bg-teletext-green/15 text-teletext-green",
              flash.tone === "seek" &&
                "border-teletext-cyan/70 bg-teletext-cyan/15 text-teletext-cyan",
            )}
          >
            {flash.text}
          </div>
        )}

        <SyncBar
          iAmHost={iAmHost}
          someoneElseHosts={someoneElseHosts}
          hostState={hostState}
          myProgress={myProgress}
          onTakeControl={takeControl}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] [&>*]:min-w-0">
          <StreamPlayer streams={streams} room={slug} />
          <ChatPanel room={slug} onMembersChange={setMembers} onSync={handleSync} />
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="pixel-shadow w-full max-w-md border-2 border-teletext-yellow bg-card p-6">
            <p className="font-display glow-yellow text-[11px] tracking-wider text-teletext-yellow">
              ⚠ END WATCH PARTY?
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You&apos;re the last one here. Leaving will end the party — it will
              disappear from the live list.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="pixel-press font-display border-2 border-teletext-cyan/50 px-3 py-1.5 text-[8px] tracking-wider text-teletext-cyan hover:border-teletext-yellow hover:text-teletext-yellow"
              >
                STAY
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="pixel-press font-display border-2 border-teletext-yellow bg-teletext-yellow px-3 py-1.5 text-[8px] tracking-wider text-background"
              >
                LEAVE & END
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Playback-sync indicator: shows who's controlling and how far you've drifted. */
function SyncBar({
  iAmHost,
  someoneElseHosts,
  hostState,
  myProgress,
  onTakeControl,
}: {
  iAmHost: boolean;
  someoneElseHosts: boolean;
  hostState: SyncPayload | null;
  myProgress: number;
  onTakeControl: () => void;
}) {
  if (iAmHost) {
    return (
      <div className="mb-6 flex items-center gap-2 border-2 border-teletext-green/60 bg-teletext-green/10 px-4 py-2.5 text-[11px] tracking-wider text-teletext-green">
        <span className="inline-block h-2 w-2 animate-blink bg-teletext-green" />
        ▌YOU&apos;RE HOSTING — EVERYONE FOLLOWS YOUR PLAYBACK
      </div>
    );
  }

  if (!someoneElseHosts || !hostState) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-2 border-foreground bg-card/40 px-4 py-2.5 text-[11px] tracking-wider text-muted-foreground">
        <span>░ NO HOST SYNCING RIGHT NOW</span>
        <button
          type="button"
          onClick={onTakeControl}
          className="pixel-press font-display border-2 border-teletext-cyan/50 px-2.5 py-1 text-[8px] tracking-wider text-teletext-cyan hover:border-teletext-yellow hover:text-teletext-yellow"
        >
          TAKE CONTROL
        </button>
      </div>
    );
  }

  const paused = hostState.status === "paused" || hostState.status === "pause";
  const drift = Math.round(myProgress - hostState.progress);
  const behind = drift < 0;
  const farOff = Math.abs(drift) >= DRIFT_NUDGE;

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center justify-between gap-2 border-2 px-4 py-2.5 text-[11px] tracking-wider",
        paused
          ? "border-teletext-amber/60 bg-teletext-amber/10 text-teletext-amber"
          : "border-teletext-cyan/60 bg-teletext-cyan/10 text-teletext-cyan",
      )}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-display">
          {paused ? "⏸" : "▶"} {hostState.host.toUpperCase()} · {fmtTime(hostState.progress)}
        </span>
        <span className="text-muted-foreground">
          you {fmtTime(myProgress)} ({drift === 0 ? "in sync" : `${behind ? "−" : "+"}${Math.abs(drift)}s`})
        </span>
        {farOff && (
          <span className="text-teletext-yellow">
            → SEEK TO {fmtTime(hostState.progress)} TO CATCH UP
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onTakeControl}
        className="pixel-press font-display shrink-0 border-2 border-current px-2.5 py-1 text-[8px] tracking-wider opacity-80 hover:opacity-100"
      >
        TAKE CONTROL
      </button>
    </div>
  );
}
