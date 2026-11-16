import { useCallback, useEffect, useState } from "react";
import { fetchStatus, type PixelState, type PixelStatus } from "@/lib/pixel-chat";

export type PixelLiveState = PixelState | "unknown";

/** Words for screen readers, e.g. "Ask Pixel, chat assistant (napping)". */
export const STATE_LABEL: Record<PixelLiveState, string> = {
  online: "online",
  warming: "warming up",
  loading: "loading",
  too_hot: "cooling down",
  offline: "napping",
  unknown: "connecting",
};

/**
 * Polls the phone's status: every 10 s while it's unavailable and the chat is
 * open, 30 s while open, 60 s while closed, and never while the tab is hidden.
 */
export function usePixelStatus(open: boolean) {
  const [status, setStatus] = useState<PixelStatus | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await fetchStatus());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  const state: PixelLiveState = failed ? "offline" : status?.state ?? "unknown";
  const unavailable = state === "offline" || state === "loading" || state === "too_hot";

  useEffect(() => {
    const interval = open ? (unavailable ? 10_000 : 30_000) : 60_000;
    const tick = () => {
      if (!document.hidden) void refresh();
    };
    // Don't compete with the page's first paint for the initial check.
    const first = setTimeout(tick, open ? 0 : 1200);
    const timer = setInterval(tick, interval);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [open, unavailable, refresh]);

  return { status, state, unavailable, refresh };
}
