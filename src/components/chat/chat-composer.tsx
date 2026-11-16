import { forwardRef, useLayoutEffect, useRef, useImperativeHandle } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  disabled: boolean;
  maxChars: number;
};

const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export const ChatComposer = forwardRef<HTMLTextAreaElement, Props>(function ChatComposer(
  { value, onChange, onSend, onStop, busy, disabled, maxChars },
  ref,
) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => textarea.current!, []);

  // Grow with the text (Firefox lacks field-sizing: content).
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [value]);

  const canSend = !busy && !disabled && value.trim().length > 0;
  const count = [...value].length;

  return (
    <div className="border-t p-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="flex items-end gap-2 rounded-xl border bg-background p-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <Textarea
          ref={textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || isTouch()) return;
            e.preventDefault();
            if (canSend) onSend();
          }}
          rows={1}
          maxLength={maxChars}
          enterKeyHint="send"
          placeholder={disabled ? "Pixel is resting…" : "Ask about Bhawar…"}
          aria-label="Message Pixel"
          disabled={disabled}
          className="max-h-32 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-base shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent"
        />
        <div className="flex flex-col items-center gap-1">
          {count >= maxChars - 100 && (
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                count >= maxChars ? "text-destructive-foreground" : "text-muted-foreground",
              )}
            >
              {count}/{maxChars}
            </span>
          )}
          <AnimatePresence mode="wait" initial={false}>
            {busy ? (
              <motion.div key="stop" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.12 }}>
                <Button type="button" variant="secondary" size="icon" className="size-8 rounded-lg max-sm:size-10" onClick={onStop} aria-label="Stop" title="Stop">
                  <Square className="size-3 fill-current" />
                </Button>
              </motion.div>
            ) : (
              <motion.div key="send" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.12 }}>
                <Button type="button" size="icon" className="size-8 rounded-lg max-sm:size-10" onClick={onSend} disabled={!canSend} aria-label="Send" title="Send">
                  <ArrowUp />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] leading-snug text-muted-foreground/80">
        Pixel is a tiny model and can get things wrong. Chats are saved on the phone for 90 days to
        help Bhawar improve it. Please don't share personal details.
      </p>
    </div>
  );
});
