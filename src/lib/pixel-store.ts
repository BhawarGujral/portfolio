import { useSyncExternalStore } from "react";
import type { PixelStatus } from "@/lib/pixel-chat";
import type { PixelLiveState } from "@/hooks/use-pixel-status";

// The chat widget is the only thing that polls the phone. It publishes what it
// learns here so the hero card, the case study and the footer can show the same
// live status without polling the phone a second time.

export type PixelSnapshot = { status: PixelStatus | null; state: PixelLiveState };

let snapshot: PixelSnapshot = { status: null, state: "unknown" };
const listeners = new Set<() => void>();

export function publishPixel(next: PixelSnapshot) {
  if (next.status === snapshot.status && next.state === snapshot.state) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function usePixelSnapshot(): PixelSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
