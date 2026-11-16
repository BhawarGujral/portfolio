import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage as Message } from "@/hooks/use-pixel-chat";
import { LinkifiedText } from "./linkified-text";

const bubble = "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words";
const assistantBubble = cn(bubble, "mr-auto rounded-bl-md bg-muted leading-relaxed");

function TypingDots() {
  const reduce = useReducedMotion();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mr-auto flex flex-col gap-1">
      <div className={cn(assistantBubble, "flex h-9 items-center gap-1")} aria-hidden="true">
        {reduce ? (
          <span className="text-muted-foreground">Thinking…</span>
        ) : (
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground/60"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
            />
          ))
        )}
      </div>
      {slow && <p className="pl-1 text-xs text-muted-foreground">Waking the phone…</p>}
    </div>
  );
}

function QueueBubble({ position, etaSec }: { position: number; etaSec: number }) {
  return (
    <div className={cn(assistantBubble, "flex items-center gap-2 text-muted-foreground")}>
      <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
      <span>
        {position <= 1 ? "You're next" : "You're "}
        {position > 1 && (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={position}
              className="inline-block font-medium text-foreground tabular-nums"
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
            >
              #{position}
            </motion.span>
          </AnimatePresence>
        )}
        {position > 1 && " in line"} · about {etaSec} s
      </span>
    </div>
  );
}

const formatMeta = (meta: NonNullable<Message["meta"]>) =>
  [
    meta.tokPerSec != null && `${meta.tokPerSec} tok/s`,
    meta.ttftMs != null && `first word ${(meta.ttftMs / 1000).toFixed(1)} s`,
  ]
    .filter(Boolean)
    .join(" · ");

export function ChatMessage({ message, onRetry }: { message: Message; onRetry: (id: string) => void }) {
  if (message.role === "user") {
    return <div className={cn(bubble, "ml-auto rounded-br-md bg-primary text-primary-foreground")}>{message.content}</div>;
  }

  if (message.status === "queued" && message.queue) return <QueueBubble {...message.queue} />;
  if (message.status === "typing") return <TypingDots />;

  const { error } = message;
  const retry = (label: string) => (
    <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => onRetry(message.id)}>
      {label}
    </Button>
  );

  if (error?.discarded) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="mr-auto flex max-w-[85%] flex-col items-start gap-1.5">
        <div className={cn(bubble, "rounded-bl-md border border-dashed bg-transparent text-muted-foreground")}>{error.message}</div>
        {error.retryable && retry("Try again")}
      </motion.div>
    );
  }

  return (
    <div className="mr-auto flex max-w-[85%] flex-col items-start">
      {message.content && (
        <div className={cn(assistantBubble, "max-w-full")}>
          <LinkifiedText text={message.content} />
          {message.status === "streaming" && (
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground" aria-hidden="true" />
          )}
        </div>
      )}

      {message.status === "done" && message.meta && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mt-1 pl-1 font-mono text-[10px] text-muted-foreground/70 tabular-nums"
        >
          {formatMeta(message.meta)}
        </motion.p>
      )}

      {message.status === "stopped" && (
        <div className="mt-1 flex items-center gap-2 pl-1 text-[11px] text-muted-foreground">
          <span>Stopped</span>
          {retry("Retry")}
        </div>
      )}

      {message.status === "error" && error && (
        <div role="alert" className={cn("flex items-center gap-2 pl-1 text-xs text-destructive-foreground", message.content && "mt-1.5")}>
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{error.message}</span>
          {error.retryable && retry("Try again")}
        </div>
      )}
    </div>
  );
}
