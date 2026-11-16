import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchGuestbook, signGuestbook, type GuestbookEntry } from "@/lib/guestbook";
import { layoutAll, type Spot } from "@/lib/guestbook-layout";

export type PlacedEntry = GuestbookEntry & Spot;
export type WallState = "loading" | "ready" | "offline";

const MY_ENTRY_KEY = "guestbook:my-entry";

function loadMine(): GuestbookEntry | null {
  try {
    const raw = localStorage.getItem(MY_ENTRY_KEY);
    return raw ? (JSON.parse(raw) as GuestbookEntry) : null;
  } catch {
    return null;
  }
}

function saveMine(entry: GuestbookEntry) {
  try {
    localStorage.setItem(MY_ENTRY_KEY, JSON.stringify(entry));
  } catch {
    // private mode: the visitor just won't see their highlight next time
  }
}

/** The wall's data: everyone who signed, the visitor's own entry, and signing. */
export function useGuestbook() {
  const [raw, setRaw] = useState<GuestbookEntry[]>([]);
  const [count, setCount] = useState(0);
  const [state, setState] = useState<WallState>("loading");
  const [mineSaved, setMineSaved] = useState<GuestbookEntry | null>(loadMine);
  const [landingId, setLandingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchGuestbook(controller.signal)
      .then((list) => {
        setRaw(list.entries);
        setCount(list.count);
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("offline");
      });
    return () => controller.abort();
  }, []);

  // Positions come from the server; older servers get the same layout here.
  const entries = useMemo(() => layoutAll(raw), [raw]) as PlacedEntry[];
  const mine = useMemo(
    () => (mineSaved ? (entries.find((e) => e.id === mineSaved.id) ?? null) : null),
    [entries, mineSaved],
  );

  const sign = useCallback(async (name: string, website: string) => {
    const entry = await signGuestbook(name, website);
    if (entry.id > 0) {
      setRaw((list) => [entry, ...list.filter((e) => e.id !== entry.id)]);
      setCount((c) => c + 1);
      setLandingId(entry.id);
    }
    setMineSaved(entry);
    saveMine(entry);
    return entry;
  }, []);

  return { entries, count, state, mine, hasSigned: mineSaved !== null, landingId, sign };
}
