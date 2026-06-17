"use client";

import { useEffect } from "react";
import { useLightsOut } from "@/lib/use-lights-out";

// Mounted once in the root layout: mirrors the lights-out preference onto the
// <html> element so the black theme applies to every route (home, live/[slug]),
// not just where a toggle is rendered. The inline boot script in layout.tsx
// sets the class before first paint to avoid a flash; this keeps it in sync as
// the preference changes at runtime. Toggling a DOM class is a side effect, not
// React state, so there's no setState-in-effect here.
export function LightsOutSync() {
  const { lightsOut } = useLightsOut();

  useEffect(() => {
    document.documentElement.classList.toggle("crt-dark", lightsOut);
  }, [lightsOut]);

  return null;
}
