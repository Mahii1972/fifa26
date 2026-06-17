"use client";

import { useSyncExternalStore } from "react";

// Shared "lights-out" preference: blacks the whole UI out to a pure-black
// teletext look. Backed by localStorage so it persists across reloads and
// pages, and stays in sync across tabs. Read via useSyncExternalStore with a
// server snapshot of `false`, which keeps SSR/first paint stable (no hydration
// mismatch) and avoids a setState-in-effect.
//
// Keep LIGHTS_OUT_KEY in sync with the inline boot script in app/layout.tsx.
export const LIGHTS_OUT_KEY = "hem-lights-out";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot() {
  return localStorage.getItem(LIGHTS_OUT_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

export function setLightsOut(next: boolean) {
  localStorage.setItem(LIGHTS_OUT_KEY, next ? "1" : "0");
  // 'storage' only fires in other tabs, so notify this tab's subscribers too.
  for (const listener of listeners) listener();
}

export function useLightsOut() {
  const lightsOut = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { lightsOut, toggle: () => setLightsOut(!lightsOut) };
}
