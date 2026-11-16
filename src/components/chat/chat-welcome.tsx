import { motion } from "motion/react";
import { Smartphone } from "lucide-react";

const chip =
  "rounded-full border bg-background px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

export function ChatWelcome({
  suggestions,
  disabled,
  onPick,
}: {
  suggestions: string[];
  disabled: boolean;
  onPick: (question: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Smartphone className="size-5 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold">Ask me about Bhawar</h3>
      <p className="mx-auto mt-1 max-w-[30ch] text-sm text-muted-foreground">
        I'm a small AI model running on a Pixel 7 at his place. Not fast, but entirely homemade.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {suggestions.map((question, i) => (
          <motion.button
            key={question}
            type="button"
            className={chip}
            disabled={disabled}
            onClick={() => onPick(question)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04, duration: 0.25 }}
          >
            {question}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
