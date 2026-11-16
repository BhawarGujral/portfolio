import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LocateFixed, Move, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Edges } from "@/hooks/use-board-camera";

const pill = "rounded-full border bg-background/80 backdrop-blur";
const iconButton = cn(
  pill,
  "flex size-9 items-center justify-center text-muted-foreground shadow-sm transition-colors hover:text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-sm:size-11",
);

type ControlsProps = {
  count: number;
  hasMine: boolean;
  coarse: boolean;
  explore: boolean;
  onRecenter: () => void;
  onFindMine: () => void;
  onExplore: (value: boolean) => void;
};

/** Bottom-left: recenter, find mine, explore (touch), and the signature count. */
export function BoardControls({ count, hasMine, coarse, explore, onRecenter, onFindMine, onExplore }: ControlsProps) {
  return (
    <div data-board-ui className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className={iconButton} onClick={onRecenter} aria-label="Recenter" title="Recenter">
        <LocateFixed className="size-4" />
      </button>
      {hasMine && (
        <button type="button" className={iconButton} onClick={onFindMine} aria-label="Find mine" title="Find mine">
          <UserRound className="size-4" />
        </button>
      )}
      {coarse &&
        (explore ? (
          <button type="button" className={cn(pill, "h-9 px-4 text-sm font-medium shadow-sm max-sm:h-11")} onClick={() => onExplore(false)}>
            Done
          </button>
        ) : (
          <button type="button" className={iconButton} onClick={() => onExplore(true)} aria-label="Explore" title="Explore">
            <Move className="size-4" />
          </button>
        ))}
      <span className={cn(pill, "px-3 py-1.5 text-xs text-muted-foreground tabular-nums")}>
        {count === 1 ? "1 signature" : `${count.toLocaleString()} signatures`}
      </span>
    </div>
  );
}

const CHEVRONS = [
  { edge: "left", Icon: ChevronLeft, className: "left-2 top-1/2 -translate-y-1/2", label: "Look left" },
  { edge: "right", Icon: ChevronRight, className: "right-2 top-1/2 -translate-y-1/2", label: "Look right" },
  { edge: "up", Icon: ChevronUp, className: "top-2 left-1/2 -translate-x-1/2", label: "Look up" },
  { edge: "down", Icon: ChevronDown, className: "bottom-2 left-1/2 -translate-x-1/2", label: "Look down" },
] as const;

/** Arrows on the edges that have more wall beyond them. */
export function EdgeHints({ edges, onPan, hideTop }: { edges: Edges; onPan: (edge: keyof Edges) => void; hideTop: boolean }) {
  return (
    <>
      {CHEVRONS.map(({ edge, Icon, className, label }) => (
        <button
          key={edge}
          type="button"
          data-board-ui
          tabIndex={-1}
          aria-label={label}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onPan(edge)}
          className={cn(
            pill,
            "absolute z-10 flex size-8 items-center justify-center text-muted-foreground shadow-sm transition-opacity duration-150 hover:text-foreground",
            className,
            edges[edge] && !(edge === "up" && hideTop) ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </>
  );
}

/** One line of help at the bottom centre, depending on device and mode. */
export function BoardHint({ text, id }: { text: string | null; id: string }) {
  return (
    <p
      id={id}
      className={cn(
        pill,
        "pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 px-3 py-1 text-xs whitespace-nowrap text-muted-foreground transition-opacity sm:block",
        text ? "opacity-100" : "opacity-0",
      )}
    >
      {text ?? " "}
    </p>
  );
}
