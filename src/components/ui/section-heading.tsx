import type * as React from "react";
import { motion } from "motion/react";
import { reveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** "01 / About" eyebrow, the section title, and an optional subline. */
export function SectionHeading({
  index,
  label,
  title,
  children,
  className,
}: {
  index: string;
  label: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.header {...reveal} className={cn("mb-10 sm:mb-14", className)}>
      <p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
        <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
        {index} / {label}
      </p>
      <h2 className="text-[clamp(1.875rem,4vw,3rem)] leading-[1.08] font-semibold tracking-[-0.02em] text-balance">
        {title}
      </h2>
      {children && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{children}</p>}
    </motion.header>
  );
}
