import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { ChatMessage as Message } from "@/hooks/use-pixel-chat";
import { ChatMessage } from "./chat-message";

/**
 * The conversation. It follows new words as they stream in, unless the
 * visitor has scrolled up to read, in which case a "Latest" pill appears.
 */
export function ChatMessages({ messages, onRetry }: { messages: Message[]; onRetry: (id: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const lastUserId = [...messages].reverse().find((m) => m.role === "user")?.id;
  const last = messages.at(-1);

  const toBottom = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    stuck.current = true;
    setShowJump(false);
  };

  // Sending always jumps to the bottom.
  useLayoutEffect(toBottom, [lastUserId]);

  // New words: follow them if we're at the bottom, otherwise offer the pill.
  useLayoutEffect(() => {
    if (stuck.current) toBottom();
    else setShowJump(true);
  }, [last?.content, last?.status]);

  // Screen readers hear queue moves and the finished answer, never each word.
  const lastRole = last?.role;
  const lastStatus = last?.status;
  const lastContent = last?.content;
  const queuePosition = last?.queue?.position;
  useEffect(() => {
    if (lastRole !== "assistant") return;
    if (lastStatus === "queued" && queuePosition) setAnnouncement(`You're number ${queuePosition} in line.`);
    if (lastStatus === "done" && lastContent) setAnnouncement(lastContent);
  }, [lastRole, lastStatus, queuePosition, lastContent]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (stuck.current) setShowJump(false);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain">
        <div role="log" aria-live="off" className="flex flex-col gap-4 px-4 py-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onRetry={onRetry} />
          ))}
        </div>
      </div>
      {showJump && (
        <button
          type="button"
          onClick={toBottom}
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs shadow-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ArrowDown className="size-3" aria-hidden="true" /> Latest
        </button>
      )}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
