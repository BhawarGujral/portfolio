import type { RefObject } from "react";
import {
  BatteryCharging,
  BatteryMedium,
  Flame,
  LoaderCircle,
  Moon,
  RotateCcw,
  Smartphone,
  Thermometer,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE_CHARS, type PixelStatus } from "@/lib/pixel-chat";
import type { PixelLiveState } from "@/hooks/use-pixel-status";
import type { usePixelChat } from "@/hooks/use-pixel-chat";
import { StatusDot } from "./status-dot";
import { ChatWelcome } from "./chat-welcome";
import { ChatMessages } from "./chat-messages";
import { ChatComposer } from "./chat-composer";

const SUBTITLE: Record<PixelLiveState, string> = {
  online: "Gemma 4 · running on a Pixel 7",
  warming: "Warming up…",
  loading: "Loading the model…",
  offline: "Napping",
  too_hot: "Cooling down",
  unknown: "Gemma 4 · running on a Pixel 7",
};

const BANNER = {
  offline: { Icon: Moon, text: "Pixel is napping. The phone is offline right now. Try again in a bit, or reach Bhawar via the Contact section.", className: "" },
  loading: { Icon: LoaderCircle, text: "Loading the model into memory. About a minute.", className: "animate-spin" },
  too_hot: { Icon: Flame, text: "The phone is running hot and taking a breather. Back shortly.", className: "text-orange-500" },
} as const;

function PhoneStats({ status, streaming }: { status: PixelStatus; streaming: boolean }) {
  const battery = status.battery && status.battery.ageSec <= 600 ? status.battery : null;
  const hot = battery && battery.temperatureC >= 40;
  const BatteryIcon = battery?.plugged ? BatteryCharging : BatteryMedium;
  return (
    <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
      {status.tokPerSec != null && (
        <span className="flex items-center gap-1" title="Average writing speed">
          <Zap className={cn("size-3", streaming && "animate-pulse")} aria-hidden="true" />
          {status.tokPerSec} tok/s
        </span>
      )}
      {battery && (
        <>
          <span className={cn("flex items-center gap-1", hot && "text-orange-600 dark:text-orange-400")} title="Phone battery temperature">
            <Thermometer className="size-3" aria-hidden="true" />
            {Math.round(battery.temperatureC)}°C
          </span>
          <span className="flex items-center gap-1" title={battery.plugged ? "Charging" : "Battery"}>
            <BatteryIcon className="size-3" aria-hidden="true" />
            {battery.percentage}%
          </span>
        </>
      )}
      <span className="ml-auto" title="Answers since the server last started">
        {status.answersServed.toLocaleString()} {status.answersServed === 1 ? "answer" : "answers"}
      </span>
    </div>
  );
}

type Chat = ReturnType<typeof usePixelChat>;

export function ChatPanel({
  status,
  state,
  chat,
  suggestions,
  draft,
  setDraft,
  mobile,
  onClose,
  composerRef,
  closeRef,
}: {
  status: PixelStatus | null;
  state: PixelLiveState;
  chat: Chat;
  suggestions: string[];
  draft: string;
  setDraft: (value: string) => void;
  mobile: boolean;
  onClose: () => void;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
}) {
  const banner =
    state === "offline" || state === "loading" || state === "too_hot"
      ? BANNER[state]
      : chat.notice?.kind === "napping"
        ? BANNER.offline
        : null;
  const unavailable = banner !== null;
  const streaming = chat.messages.at(-1)?.status === "streaming";
  const iconButton = "size-8 max-sm:size-11";

  const send = (text: string) => {
    if (!text.trim() || chat.busy || unavailable) return;
    chat.send(text);
    setDraft("");
  };

  return (
    <>
      <header
        className="flex items-center gap-3 border-b px-4 py-3"
        style={mobile ? { paddingTop: "max(0.75rem, env(safe-area-inset-top))" } : undefined}
      >
        <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="size-4 text-primary" aria-hidden="true" />
          <StatusDot state={state} className="-right-0.5 -bottom-0.5 size-2.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-none font-semibold">Pixel</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">{SUBTITLE[state]}</p>
        </div>
        {chat.messages.length > 0 && (
          <Button variant="ghost" size="icon" className={iconButton} onClick={chat.reset} aria-label="New chat" title="New chat">
            <RotateCcw />
          </Button>
        )}
        <Button ref={closeRef} variant="ghost" size="icon" className={iconButton} onClick={onClose} aria-label="Close chat" title="Close chat">
          <X />
        </Button>
      </header>

      {status && <PhoneStats status={status} streaming={streaming} />}

      {chat.messages.length === 0 ? (
        <ChatWelcome suggestions={suggestions} disabled={unavailable || chat.busy} onPick={send} />
      ) : (
        <ChatMessages messages={chat.messages} onRetry={chat.retry} />
      )}

      {banner && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground" role="status">
          <banner.Icon className={cn("mt-px size-3.5 shrink-0", banner.className)} aria-hidden="true" />
          <span>{banner.text}</span>
        </div>
      )}
      {!banner && chat.notice && (
        <p className="mx-auto mb-2 max-w-[90%] text-center text-xs text-muted-foreground" role="status">
          {chat.notice.message}
        </p>
      )}

      <ChatComposer
        ref={composerRef}
        value={draft}
        onChange={(value) => {
          setDraft(value);
          if (chat.notice && chat.notice.kind !== "napping") chat.dismissNotice();
        }}
        onSend={() => send(draft)}
        onStop={chat.stop}
        busy={chat.busy}
        disabled={unavailable}
        maxChars={status?.limits.maxMessageChars ?? MAX_MESSAGE_CHARS}
      />
    </>
  );
}
