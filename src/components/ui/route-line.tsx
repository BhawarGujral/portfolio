import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type RoutePoint = {
  x: number;
  y: number;
  label?: string;
  sub?: string;
  /** Where the label sits relative to the dot. */
  labelAt?: "above" | "below";
  /** Filled marigold dot (the destination). */
  filled?: boolean;
};

/**
 * The site's motif: a dashed marigold route with node dots. The dashes are
 * revealed by a solid stroke in a mask, so the line can "draw" itself once.
 */
export function RouteLine({
  points,
  width,
  height,
  title,
  className,
}: {
  points: RoutePoint[];
  width: number;
  height: number;
  title: string;
  className?: string;
}) {
  const maskId = useId();
  const d = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" className={cn("h-auto w-full overflow-visible", className)}>
      <title>{title}</title>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-20} y={-20} width={width + 40} height={height + 40}>
          <motion.path
            d={d}
            fill="none"
            stroke="white"
            strokeWidth={8}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </mask>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={2.5}
        strokeDasharray="6 7"
        strokeLinecap="round"
        mask={`url(#${maskId})`}
      />
      {points.map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <circle
            cx={p.x}
            cy={p.y}
            r={p.filled ? 7 : 6}
            fill={p.filled ? "var(--brand)" : "var(--card)"}
            stroke={p.filled ? "var(--brand)" : "var(--foreground)"}
            strokeWidth={2}
          />
          {p.label && (
            <text
              x={p.x}
              y={p.labelAt === "above" ? p.y - 16 : p.y + 26}
              textAnchor="middle"
              className="fill-foreground text-[13px] font-semibold"
            >
              {p.label}
            </text>
          )}
          {p.sub && (
            <text
              x={p.x}
              y={p.labelAt === "above" ? p.y - 32 : p.y + 42}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase"
            >
              {p.sub}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
