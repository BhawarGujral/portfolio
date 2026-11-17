import type * as React from "react";
import { cn } from "@/lib/utils";

/** The rounded card every section is built from. */
export function Tile({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-w-0 rounded-3xl border bg-card p-6 text-card-foreground sm:p-8", className)} {...props} />;
}

/** A small mono label, e.g. "this year" or "domains". */
export function MonoLabel({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase", className)} {...props} />;
}

/** A wrapping list of pill chips. */
export function ChipList({
  items,
  className,
  chipClassName,
}: {
  items: string[];
  className?: string;
  chipClassName?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <li key={item} className={cn("rounded-full border px-3 py-1 text-sm", chipClassName)}>
          {item}
        </li>
      ))}
    </ul>
  );
}
