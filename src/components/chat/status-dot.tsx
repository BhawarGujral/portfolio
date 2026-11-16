import { cn } from "@/lib/utils";
import type { PixelLiveState } from "@/hooks/use-pixel-status";

// The only color in the chat UI, and it's semantic: alive, waking up, or hot.
const DOT: Record<PixelLiveState, string> = {
  online: "bg-emerald-500",
  warming: "bg-amber-500",
  loading: "bg-amber-500",
  too_hot: "bg-orange-500",
  offline: "bg-muted-foreground/50",
  unknown: "bg-muted-foreground/50",
};

export function StatusDot({
  state,
  pulse = false,
  className,
}: {
  state: PixelLiveState;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("absolute block size-3 rounded-full ring-2 ring-background", DOT[state], className)}>
      {pulse && state === "online" && (
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 [animation-iteration-count:3] animate-ping motion-reduce:hidden" />
      )}
    </span>
  );
}
