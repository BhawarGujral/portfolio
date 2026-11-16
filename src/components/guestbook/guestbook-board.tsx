import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { L, stickerWidth } from "@/lib/guestbook-layout";
import { useGuestbook, type PlacedEntry } from "@/hooks/use-guestbook";
import { useBoardCamera, type Box, type Edges } from "@/hooks/use-board-camera";
import { Sticker } from "./sticker";
import { SignComposer } from "./sign-composer";
import { BoardControls, BoardHint, EdgeHints } from "./board-controls";
import { BoardMinimap } from "./board-minimap";

const HINT_ID = "guestbook-wall-hint";
const CULL_MARGIN = 400; // render stickers this far outside the view, so panning never shows gaps

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

// The area the camera may roam: every sticker, plus room for the sign box on
// top and the controls at the bottom.
function wallBox(entries: PlacedEntry[]): Box | null {
  if (!entries.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const e of entries) {
    const half = stickerWidth(e.name) / 2;
    minX = Math.min(minX, e.x - half);
    maxX = Math.max(maxX, e.x + half);
    minY = Math.min(minY, e.y - L.H / 2);
    maxY = Math.max(maxY, e.y + L.H / 2);
  }
  return { minX: minX - 40, maxX: maxX + 40, minY: minY - 76, maxY: maxY + 64 };
}

/** "The Wall": a pannable wall of taped-up name tags. */
export function GuestbookBoard() {
  const { entries, count, state, mine, hasSigned, landingId, sign } = useGuestbook();
  const reduceMotion = useReducedMotion() ?? false;
  const coarse = useMediaQuery("(pointer: coarse)");
  const dark = useIsDark();
  const [openId, setOpenId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [revealed, setRevealed] = useState(false);

  const box = useMemo(() => wallBox(entries), [entries]);
  const mineRef = useRef(mine);
  mineRef.current = mine;
  const panToRef = useRef<(x: number, y: number) => void>(() => {});
  const findMine = useCallback(() => {
    const m = mineRef.current;
    if (m) panToRef.current(m.x, m.y);
  }, []);

  const camera = useBoardCamera({ box, reduceMotion, onFindMine: findMine });
  panToRef.current = camera.panTo;
  const { viewport, cull, edges, active, explore } = camera;

  // First appearance: stickers fade in, then (once) glide to the visitor's own.
  const glided = useRef(false);
  useEffect(() => {
    if (state !== "ready") return;
    const timer = setTimeout(() => {
      setRevealed(true);
      if (!glided.current && mineRef.current) {
        glided.current = true;
        findMine();
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [state, findMine]);

  // A fresh signature: glide over, then the sticker drops in.
  useEffect(() => {
    if (landingId === null) return;
    const entry = entries.find((e) => e.id === landingId);
    if (entry) camera.panTo(entry.x, entry.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingId]);

  const visible = useMemo(() => {
    const halfW = viewport.w / 2 + CULL_MARGIN;
    const halfH = viewport.h / 2 + CULL_MARGIN;
    return entries.filter(
      (e) =>
        e.id === landingId ||
        e.id === mine?.id ||
        e.id === openId ||
        (Math.abs(e.x - cull.x) < halfW + stickerWidth(e.name) / 2 && Math.abs(e.y - cull.y) < halfH + L.H),
    );
  }, [entries, viewport.w, viewport.h, cull.x, cull.y, landingId, mine?.id, openId]);

  const toggle = useCallback(
    (id: number) => {
      if (camera.wasDragging()) return;
      setOpenId((current) => (current === id ? null : id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera.wasDragging],
  );

  const overflowing = !!box && (box.maxX - box.minX > viewport.w || box.maxY - box.minY > viewport.h);
  const hint = coarse
    ? null
    : active
      ? "Arrow keys or WASD to move · Esc to leave"
      : overflowing
        ? "Drag to look around"
        : null;
  const composerVisible = state !== "loading" && !hasSigned;

  const panEdge = (edge: keyof Edges) => {
    const dx = edge === "left" ? -0.6 * viewport.w : edge === "right" ? 0.6 * viewport.w : 0;
    const dy = edge === "up" ? -0.6 * viewport.h : edge === "down" ? 0.6 * viewport.h : 0;
    camera.panBy(dx, dy);
  };

  const newest = useMemo(() => [...entries].sort((a, b) => b.id - a.id).slice(0, 100), [entries]);

  return (
    <div>
      <div
        ref={camera.frameRef}
        tabIndex={0}
        role="group"
        aria-label="Guestbook wall. Use arrow keys to look around."
        aria-describedby={HINT_ID}
        data-active={active}
        data-explore={explore}
        onClick={(e) => {
          if (e.target === e.currentTarget && !camera.wasDragging()) setOpenId(null);
        }}
        className={cn(
          "relative isolate h-[70svh] max-h-[640px] min-h-[440px] w-full cursor-grab touch-pan-y overflow-hidden rounded-2xl border bg-muted/30 shadow-xs outline-none select-none transition-shadow active:cursor-grabbing focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[active=true]:border-foreground/40 data-[explore=true]:touch-none",
          "bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] bg-[length:24px_24px]",
        )}
      >
        <div ref={camera.worldRef} className="absolute top-0 left-0 will-change-transform" aria-hidden="true">
          {visible.map((entry, i) => (
            <Sticker
              key={entry.id}
              entry={entry}
              mine={entry.id === mine?.id}
              open={entry.id === openId}
              landing={entry.id === landingId}
              revealDelayMs={revealed || reduceMotion ? null : Math.min(i * 15, 400)}
              reduceMotion={reduceMotion}
              onToggle={toggle}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_0_rgb(0_0_0/0.04)] dark:shadow-[inset_0_0_60px_0_rgb(0_0_0/0.35)]" />

        {state === "loading" && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Unrolling the wall…
          </p>
        )}
        {state === "offline" && (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
            The wall lives on my phone, and it looks like it's napping. Check back in a bit.
          </p>
        )}
        {state === "ready" && entries.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
            A blank wall. Be the first to sign it.
          </p>
        )}

        {state !== "loading" && (
          <SignComposer disabled={state === "offline"} hidden={!composerVisible} onSign={sign} onAnnounce={setAnnouncement} />
        )}
        {box && overflowing && (
          <BoardMinimap
            entries={entries}
            box={box}
            mineId={mine?.id ?? null}
            viewport={viewport}
            dark={dark}
            onCamera={camera.onCamera}
            onPick={(x, y) => camera.panTo(x, y)}
          />
        )}
        <EdgeHints edges={edges} onPan={panEdge} hideTop={composerVisible} />
        {state === "ready" && (
          <BoardControls
            count={count}
            hasMine={!!mine}
            coarse={coarse && overflowing}
            explore={explore}
            onRecenter={camera.recenter}
            onFindMine={findMine}
            onExplore={camera.setExplore}
          />
        )}
        <BoardHint id={HINT_ID} text={hint} />
      </div>

      {/* For screen readers: the wall as a plain list. */}
      <ol className="sr-only" aria-label="People who signed">
        {newest.map((e) => (
          <li key={e.id}>
            {e.name}, signed {new Date(e.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </li>
        ))}
        {count > newest.length && <li>and {count - newest.length} more</li>}
      </ol>
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
