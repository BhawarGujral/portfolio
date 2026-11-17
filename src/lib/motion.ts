// Shared motion presets. <MotionConfig reducedMotion="user"> in main.tsx turns
// the movement off for visitors who ask for reduced motion.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: EASE_OUT },
};

/** The same reveal, delayed for the nth sibling in a row. */
export function revealAt(index: number) {
  return { ...reveal, transition: { ...reveal.transition, delay: index * 0.06 } };
}
