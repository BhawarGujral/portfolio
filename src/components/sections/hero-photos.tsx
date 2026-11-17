import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";
import office from "@/assets/profile.jpg";
import centralPark from "@/assets/travel-central-park.jpg";
import brooklynBridge from "@/assets/travel-brooklyn-bridge.jpg";
import dumbo from "@/assets/travel-dumbo-night.jpg";
import { cn } from "@/lib/utils";

type Slide = { src: string; width: number; height: number; alt: string; place: string; position: string };

// The office photo leads; the trips follow. All metadata (incl. GPS) was
// stripped from these files before they were added.
const SLIDES: Slide[] = [
  {
    src: office,
    width: 1200,
    height: 1168,
    alt: "Bhawar Gujral standing in a bright office",
    place: "Based in Toronto",
    position: "50% 18%",
  },
  {
    src: centralPark,
    width: 768,
    height: 1024,
    alt: "Bhawar in Central Park, New York, beside red autumn trees",
    place: "Central Park, New York",
    position: "50% 60%",
  },
  {
    src: brooklynBridge,
    width: 768,
    height: 1024,
    alt: "Bhawar smiling on the Brooklyn Bridge",
    place: "Brooklyn Bridge, New York",
    position: "50% 75%",
  },
  {
    src: dumbo,
    width: 768,
    height: 1024,
    alt: "Bhawar on a cobblestone street in DUMBO at night",
    place: "DUMBO, Brooklyn",
    position: "50% 45%",
  },
];

const INTERVAL_MS = 5000;
const SWIPE_FRACTION = 0.18; // of the photo's width

/** The hero's photo carousel: slides on its own, swipes on touch, pauses on hover/focus. */
export function HeroPhotos() {
  const count = SLIDES.length;
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false); // the visitor pressed pause
  const [dragX, setDragX] = useState<number | null>(null);
  // The live drag lives in a ref (pointer events can outpace renders); dragX mirrors it for drawing.
  const pointer = useRef<{ id: number; x: number; y: number; width: number; dx: number | null } | null>(null);

  const go = (i: number) => setIndex(((i % count) + count) % count);
  const autoplay = !reduceMotion && !stopped && !hovered && !focused && dragX === null;

  // Advance every few seconds; restarts after any manual move. Skips hidden tabs.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoplay, index, count]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, width: e.currentTarget.offsetWidth, dx: null };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    if (p.dx === null) {
      // Only take over horizontal drags; vertical ones scroll the page.
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - p.y)) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // the pointer is already gone; the drag still works without capture
      }
    }
    p.dx = dx;
    setDragX(dx);
  };
  const onPointerEnd = () => {
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.dx === null) return;
    if (Math.abs(p.dx) > p.width * SWIPE_FRACTION) {
      const step = p.dx < 0 ? 1 : -1;
      setIndex((i) => (i + step + count) % count);
    }
    setDragX(null);
  };

  const current = SLIDES[index];
  const dragging = dragX !== null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Photos of Bhawar"
      className="group relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border bg-muted select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        else if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div
        className="flex h-full touch-pan-y"
        style={{
          transform: `translateX(calc(${-index * 100}% + ${dragX ?? 0}px))`,
          transition: dragging || reduceMotion ? "none" : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${slide.place}`}
            aria-hidden={i !== index}
            className="h-full w-full shrink-0"
          >
            <img
              src={slide.src}
              alt={slide.alt}
              width={slide.width}
              height={slide.height}
              draggable={false}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "low"}
              className="h-full w-full object-cover"
              style={{ objectPosition: slide.position }}
            />
          </div>
        ))}
      </div>

      {/* where this photo was taken */}
      <p
        key={index}
        aria-live={autoplay ? "off" : "polite"}
        className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-sm text-white backdrop-blur-sm animate-in fade-in duration-300 motion-reduce:animate-none"
      >
        <MapPin className="size-3.5" aria-hidden="true" />
        {current.place}
      </p>

      {/* previous / next, for mouse users (touch swipes instead) */}
      {(["prev", "next"] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => go(index + (dir === "next" ? 1 : -1))}
          aria-label={dir === "next" ? "Next photo" : "Previous photo"}
          className={cn(
            "absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity outline-none group-hover:opacity-100 hover:bg-black/60 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-white/60 [@media(hover:none)]:hidden",
            dir === "next" ? "right-3" : "left-3",
          )}
        >
          {dir === "next" ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
      ))}

      {/* dots and pause */}
      <div className="absolute right-4 bottom-4 flex items-center gap-0.5 rounded-full bg-black/45 px-1.5 py-1 backdrop-blur-sm">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show photo ${i + 1}: ${slide.place}`}
            aria-current={i === index ? "true" : undefined}
            className="flex h-6 items-center justify-center rounded-full px-1 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span
              className={cn(
                "block h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/55",
              )}
            />
          </button>
        ))}
        {!reduceMotion && (
          <button
            type="button"
            onClick={() => setStopped((s) => !s)}
            aria-label={stopped ? "Play slideshow" : "Pause slideshow"}
            className="ml-0.5 flex size-6 items-center justify-center rounded-full text-white outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {stopped ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>
        )}
      </div>
    </div>
  );
}
