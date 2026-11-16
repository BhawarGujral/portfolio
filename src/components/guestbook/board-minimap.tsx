import { useEffect, useRef } from "react";
import type { Box, Vec } from "@/hooks/use-board-camera";
import type { PlacedEntry } from "@/hooks/use-guestbook";

const W = 128;
const H = 64;

type Props = {
  entries: PlacedEntry[];
  box: Box;
  mineId: number | null;
  viewport: { w: number; h: number };
  dark: boolean;
  onCamera: (listener: (p: Vec) => void) => () => void;
  onPick: (x: number, y: number) => void;
};

/** A tiny overview of the whole wall: a dot per signature and the current view. */
export function BoardMinimap({ entries, box, mineId, viewport, dark, onCamera, onPick }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const rect = useRef<HTMLDivElement>(null);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  const scale = Math.min(W / width, H / height);
  const offsetX = (W - width * scale) / 2;
  const offsetY = (H - height * scale) / 2;
  const toMap = (x: number, y: number) => ({ x: offsetX + (x - box.minX) * scale, y: offsetY + (y - box.minY) * scale });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    el.width = W * ratio;
    el.height = H * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, W, H);
    for (const e of entries) {
      const p = toMap(e.x, e.y);
      ctx.fillStyle = e.id === mineId ? (dark ? "#fafafa" : "#171717") : `hsl(${e.hue} 70% 60%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, e.id === mineId ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, mineId, dark, box.minX, box.maxX, box.minY, box.maxY]);

  // The view rectangle follows the camera without re-rendering.
  useEffect(
    () =>
      onCamera((p) => {
        if (!rect.current) return;
        const tl = toMap(p.x - viewport.w / 2, p.y - viewport.h / 2);
        rect.current.style.transform = `translate(${tl.x}px, ${tl.y}px)`;
        rect.current.style.width = `${viewport.w * scale}px`;
        rect.current.style.height = `${viewport.h * scale}px`;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCamera, viewport.w, viewport.h, scale, offsetX, offsetY, box.minX, box.minY],
  );

  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    onPick(box.minX + (e.clientX - bounds.left - offsetX) / scale, box.minY + (e.clientY - bounds.top - offsetY) / scale);
  };

  return (
    <div
      data-board-ui
      role="presentation"
      className="absolute top-3 right-3 z-20 hidden cursor-pointer overflow-hidden rounded-lg border bg-background/80 shadow-sm backdrop-blur md:block"
      style={{ width: W, height: H }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) pick(e);
      }}
    >
      <canvas ref={canvas} style={{ width: W, height: H }} aria-hidden="true" />
      <div ref={rect} className="pointer-events-none absolute top-0 left-0 rounded-[3px] border border-foreground/60" />
    </div>
  );
}
