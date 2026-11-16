import { memo, type CSSProperties } from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { L, stickerWidth } from "@/lib/guestbook-layout";
import type { PlacedEntry } from "@/hooks/use-guestbook";
import { STICKER_ICONS } from "./sticker-icons";

const signedOn = (iso: string) =>
  `Signed ${new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;

const tag =
  "group relative flex h-full items-center gap-2.5 rounded-xl border px-3 shadow-sm transition-[transform,box-shadow] duration-200 group-hover/sticker:scale-[1.06] group-hover/sticker:shadow-md " +
  "bg-[hsl(var(--h)_85%_93%)] border-[hsl(var(--h)_60%_84%)] text-[hsl(var(--h)_55%_25%)] " +
  "dark:bg-[hsl(var(--h)_35%_20%)] dark:border-[hsl(var(--h)_35%_30%)] dark:text-[hsl(var(--h)_85%_87%)] " +
  // a strip of tape holding it to the wall
  "before:absolute before:-top-2 before:left-1/2 before:h-3.5 before:w-9 before:-translate-x-1/2 before:-rotate-3 before:rounded-[2px] before:bg-foreground/10 before:backdrop-blur-[1px]";

type Props = {
  entry: PlacedEntry;
  mine: boolean;
  open: boolean;
  landing: boolean;
  revealDelayMs: number | null; // first-load fade-in, or null once the wall has appeared
  reduceMotion: boolean;
  onToggle: (id: number) => void;
};

/** One signature: a little paper tag taped to the wall at its stored spot. */
export const Sticker = memo(function Sticker({ entry, mine, open, landing, revealDelayMs, reduceMotion, onToggle }: Props) {
  const width = stickerWidth(entry.name);
  const Icon = STICKER_ICONS[entry.sticker] ?? Star;

  const body = (
    <div className={cn(tag, mine && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/60 dark:bg-white/10">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="font-hand truncate text-lg leading-none">{entry.name}</span>
      {mine && (
        <span className="absolute -top-2 -right-2 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
          you
        </span>
      )}
      <span
        className={cn(
          "pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-opacity group-hover/sticker:opacity-100",
          open && "opacity-100",
        )}
      >
        {signedOn(entry.createdAt)}
      </span>
    </div>
  );

  const style = {
    width,
    height: L.H,
    "--h": entry.hue,
    zIndex: open || landing ? 10 : undefined,
  } as CSSProperties;
  const place = `translate3d(${entry.x - width / 2}px, ${entry.y - L.H / 2}px, 0)`;

  if (landing) {
    // Dropped onto the wall after the camera glides over.
    return (
      <div className="group/sticker absolute top-0 left-0" style={{ ...style, transform: place }} onClick={() => onToggle(entry.id)}>
        <motion.div
          className="h-full rounded-xl"
          initial={reduceMotion ? { opacity: 0, rotate: entry.r } : { opacity: 0, scale: 1.6, y: -48, rotate: entry.r - 14 }}
          animate={
            reduceMotion
              ? { opacity: 1, rotate: entry.r }
              : {
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  rotate: entry.r,
                  boxShadow: ["0 0 0 0px rgb(0 0 0 / 0)", "0 0 0 10px rgb(0 0 0 / 0.12)", "0 0 0 0px rgb(0 0 0 / 0)"],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 320, damping: 20, delay: 0.35, boxShadow: { duration: 0.6, delay: 0.75 } }
          }
        >
          {body}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={cn("group/sticker absolute top-0 left-0", revealDelayMs !== null && "animate-sticker-in")}
      style={{
        ...style,
        transform: `${place} rotate(${entry.r}deg)`,
        animationDelay: revealDelayMs !== null ? `${revealDelayMs}ms` : undefined,
      }}
      onClick={() => onToggle(entry.id)}
    >
      {body}
    </div>
  );
});
