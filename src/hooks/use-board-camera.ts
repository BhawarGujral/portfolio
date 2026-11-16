import { useCallback, useEffect, useRef, useState } from "react";

export type Vec = { x: number; y: number };
export type Box = { minX: number; maxX: number; minY: number; maxY: number };
export type Edges = { left: boolean; right: boolean; up: boolean; down: boolean };

const KEYS: Record<string, Vec> = {
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
};

const STEP = 120; // a single tap of an arrow key
const HOLD_DELAY = 180; // ms before a held key starts gliding
const EASE_MS = 90; // how quickly the view catches up with where it's going
const CULL_STEP = 200; // re-pick visible stickers after moving this far

/**
 * The camera for the guestbook wall. Input (keys, drag, wheel, buttons,
 * minimap) only moves `target`; every animation frame the view eases toward
 * it and moves the world with a CSS transform, so panning never re-renders
 * React. React state changes only for culling, edge hints and modes.
 */
export function useBoardCamera({
  box,
  reduceMotion,
  onFindMine,
}: {
  box: Box | null;
  reduceMotion: boolean;
  onFindMine?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pos = useRef<Vec>({ x: 0, y: 0 });
  const target = useRef<Vec>({ x: 0, y: 0 });
  const view = useRef({ w: 0, h: 0 });
  const boxRef = useRef(box);
  boxRef.current = box;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const findRef = useRef(onFindMine);
  findRef.current = onFindMine;

  const held = useRef(new Set<string>());
  const holdMs = useRef(0);
  const fast = useRef(false);
  const frame = useRef<number | null>(null);
  const lastTick = useRef(0);
  const activeRef = useRef(false);
  const exploreRef = useRef(false);
  const lastDragEnd = useRef(0);
  const listeners = useRef(new Set<(p: Vec) => void>());
  const cullRef = useRef<Vec>({ x: 0, y: 0 });

  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [cull, setCull] = useState<Vec>({ x: 0, y: 0 });
  const [edges, setEdges] = useState<Edges>({ left: false, right: false, up: false, down: false });
  const [active, setActiveState] = useState(false);
  const [explore, setExploreState] = useState(false);

  const setActive = (value: boolean) => {
    activeRef.current = value;
    setActiveState(value);
  };
  const setExplore = useCallback((value: boolean) => {
    exploreRef.current = value;
    setExploreState(value);
  }, []);

  // How far the camera may go: the view stays over the stickers, and an axis
  // whose content is smaller than the view stays centred.
  const range = () => {
    const b = boxRef.current;
    const { w, h } = view.current;
    if (!b) return { x: [0, 0], y: [0, 0] };
    const axis = (min: number, max: number, size: number) =>
      max - min <= size ? [(min + max) / 2, (min + max) / 2] : [min + size / 2, max - size / 2];
    return { x: axis(b.minX, b.maxX, w), y: axis(b.minY, b.maxY, h) };
  };
  const clamp = (v: Vec): Vec => {
    const r = range();
    return { x: Math.min(r.x[1], Math.max(r.x[0], v.x)), y: Math.min(r.y[1], Math.max(r.y[0], v.y)) };
  };

  const render = () => {
    const { w, h } = view.current;
    const tx = w / 2 - pos.current.x;
    const ty = h / 2 - pos.current.y;
    if (worldRef.current) worldRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    if (frameRef.current) frameRef.current.style.backgroundPosition = `${tx}px ${ty}px`;

    if (Math.hypot(pos.current.x - cullRef.current.x, pos.current.y - cullRef.current.y) > CULL_STEP) {
      cullRef.current = { ...pos.current };
      setCull(cullRef.current);
    }
    const r = range();
    const next = {
      left: pos.current.x > r.x[0] + 1,
      right: pos.current.x < r.x[1] - 1,
      up: pos.current.y > r.y[0] + 1,
      down: pos.current.y < r.y[1] - 1,
    };
    setEdges((prev) =>
      prev.left === next.left && prev.right === next.right && prev.up === next.up && prev.down === next.down
        ? prev
        : next,
    );
    listeners.current.forEach((listener) => listener(pos.current));
  };

  const heldDirection = (): Vec | null => {
    let x = 0;
    let y = 0;
    held.current.forEach((key) => {
      x += KEYS[key].x;
      y += KEYS[key].y;
    });
    const length = Math.hypot(x, y);
    return length ? { x: x / length, y: y / length } : null;
  };

  const tick = (now: number) => {
    const dt = Math.min(64, now - lastTick.current || 16);
    lastTick.current = now;

    if (held.current.size) {
      holdMs.current += dt;
      const dir = heldDirection();
      if (dir && holdMs.current > HOLD_DELAY) {
        const ramp = Math.min(1, (holdMs.current - HOLD_DELAY) / 800);
        const speed = (600 + 800 * ramp) * (fast.current ? 2 : 1);
        target.current = clamp({
          x: target.current.x + (dir.x * speed * dt) / 1000,
          y: target.current.y + (dir.y * speed * dt) / 1000,
        });
      }
    }

    if (reduceRef.current) {
      pos.current = { ...target.current };
    } else {
      const k = 1 - Math.exp(-dt / EASE_MS);
      pos.current = {
        x: pos.current.x + (target.current.x - pos.current.x) * k,
        y: pos.current.y + (target.current.y - pos.current.y) * k,
      };
    }

    const settled =
      Math.abs(target.current.x - pos.current.x) < 0.3 && Math.abs(target.current.y - pos.current.y) < 0.3;
    if (settled && !held.current.size) {
      pos.current = { ...target.current };
      render();
      frame.current = null;
      return;
    }
    render();
    frame.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame.current !== null) return;
    lastTick.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  };

  const panTo = useCallback((x: number, y: number, { instant = false } = {}) => {
    target.current = clamp({ x, y });
    if (instant || reduceRef.current) {
      pos.current = { ...target.current };
      render();
    } else {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panBy = useCallback(
    (dx: number, dy: number) => panTo(target.current.x + dx, target.current.y + dy),
    [panTo],
  );
  const recenter = useCallback(() => panTo(0, 0), [panTo]);
  const onCamera = useCallback((listener: (p: Vec) => void) => {
    listeners.current.add(listener);
    listener(pos.current);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const wasDragging = useCallback(() => performance.now() - lastDragEnd.current < 250, []);

  // Size changes (and new stickers) can move the edges, so re-clamp.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      view.current = { w: width, h: height };
      setViewport({ w: width, h: height });
      target.current = clamp(target.current);
      pos.current = clamp(pos.current);
      render();
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    target.current = clamp(target.current);
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box?.minX, box?.maxX, box?.minY, box?.maxY]);

  // Keyboard, focus, drag and wheel.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target !== el || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      fast.current = e.shiftKey;
      if (KEYS[key]) {
        e.preventDefault();
        if (!e.repeat && !held.current.has(key)) {
          held.current.add(key);
          const step = STEP * (e.shiftKey ? 2 : 1);
          target.current = clamp({
            x: target.current.x + KEYS[key].x * step,
            y: target.current.y + KEYS[key].y * step,
          });
          start();
        }
      } else if (key === "home" || key === "0") {
        e.preventDefault();
        recenter();
      } else if (key === "f") {
        e.preventDefault();
        findRef.current?.();
      } else if (key === "escape") {
        el.blur();
        setExplore(false);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      fast.current = e.shiftKey;
      held.current.delete(e.key.toLowerCase());
      if (!held.current.size) holdMs.current = 0;
    };
    const onFocus = () => setActive(true);
    const onBlur = () => {
      held.current.clear();
      holdMs.current = 0;
      setActive(false);
    };

    // Drag to pan. On touch outside explore mode, only sideways moves pan;
    // vertical swipes keep scrolling the page (touch-action: pan-y).
    let press: { id: number; x: number; y: number; cam: Vec; dragging: boolean; touch: boolean } | null = null;
    let samples: { t: number; x: number; y: number }[] = [];

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-board-ui]")) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: { ...pos.current }, dragging: false, touch: e.pointerType !== "mouse" };
      samples = [];
      if (e.pointerType === "mouse") el.focus({ preventScroll: true });
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.x;
      let dy = e.clientY - press.y;
      if (press.touch && !exploreRef.current) dy = 0;
      if (!press.dragging) {
        if (Math.hypot(dx, dy) < 4) return;
        press.dragging = true;
        el.setPointerCapture(e.pointerId);
      }
      target.current = pos.current = clamp({ x: press.cam.x - dx, y: press.cam.y - dy });
      render();
      const t = performance.now();
      samples.push({ t, x: pos.current.x, y: pos.current.y });
      samples = samples.filter((s) => t - s.t < 80);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (press.dragging) {
        lastDragEnd.current = performance.now();
        if (!reduceRef.current && samples.length > 1) {
          const first = samples[0];
          const last = samples[samples.length - 1];
          const ms = Math.max(1, last.t - first.t);
          let mx = ((last.x - first.x) / ms) * 280;
          let my = ((last.y - first.y) / ms) * 280;
          const length = Math.hypot(mx, my);
          if (length > 900) {
            mx = (mx / length) * 900;
            my = (my / length) * 900;
          }
          target.current = clamp({ x: pos.current.x + mx, y: pos.current.y + my });
          start();
        }
      }
      press = null;
    };
    const onPointerCancel = () => {
      press = null; // the browser took over (e.g. a vertical page scroll)
    };

    // Two-finger trackpad / wheel: sideways always pans; up/down pans only
    // while the wall is active and can still move that way, else the page scrolls.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? view.current.h : 1;
      const dx = e.deltaX * scale;
      const dy = e.deltaY * scale;
      const r = range();
      if (Math.abs(dx) > Math.abs(dy)) {
        const canMove = dx > 0 ? target.current.x < r.x[1] - 1 : target.current.x > r.x[0] + 1;
        if (!canMove) return;
        e.preventDefault();
        panBy(dx, 0);
        return;
      }
      const canMove = dy > 0 ? target.current.y < r.y[1] - 1 : target.current.y > r.y[0] + 1;
      if (!activeRef.current || !canMove) return;
      e.preventDefault();
      panBy(0, dy);
    };

    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("keyup", onKeyUp);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panBy, recenter, setExplore]);

  // Explore mode (touch) ends when the wall scrolls mostly out of view or
  // the visitor taps somewhere else on the page.
  useEffect(() => {
    if (!explore) return;
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.3) setExplore(false);
    }, { threshold: [0, 0.3] });
    observer.observe(el);
    const onOutside = (e: PointerEvent) => {
      if (!el.contains(e.target as Node)) setExplore(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [explore, setExplore]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return {
    frameRef,
    worldRef,
    viewport,
    cull,
    edges,
    active,
    explore,
    setExplore,
    panTo,
    panBy,
    recenter,
    onCamera,
    wasDragging,
  };
}
