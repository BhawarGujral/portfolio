import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSuggestions } from "@/lib/pixel-chat";
import { usePixelChat } from "@/hooks/use-pixel-chat";
import { usePixelStatus, STATE_LABEL } from "@/hooks/use-pixel-status";
import { StatusDot } from "./status-dot";
import { ChatPanel } from "./chat-panel";

const PANEL_ID = "pixel-chat-panel";
const NUDGE_KEY = "pixel-nudge";

const FALLBACK_SUGGESTIONS = [
  "How does this chat run on a phone?",
  "Who is Bhawar?",
  "What does Bhawar work on at TCS?",
  "What's his tech stack?",
  "How did he end up in Canada?",
  "What does he do for fun?",
  "How can I contact him?",
];
const PHONE_QUESTION = "How does this chat run on a phone?";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function readFlag(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function setFlag(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore: the nudge may show again, which is harmless
  }
}

/** "Ask Pixel": the floating launcher and the chat panel. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState(FALLBACK_SUGGESTIONS);
  const [footerVisible, setFooterVisible] = useState(false);
  const [nudge, setNudge] = useState(false);
  const mobile = useMediaQuery("(max-width: 639px)");
  const reduceMotion = useReducedMotion();

  const { status, state, refresh } = usePixelStatus(open);
  const chat = usePixelChat({ onSettled: refresh, onRestoreDraft: setDraft });

  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loadedSuggestions = useRef(false);

  const openChat = useCallback(() => {
    setOpen(true);
    setNudge(false);
    setFlag(NUDGE_KEY);
  }, []);
  const closeChat = useCallback(() => setOpen(false), []);

  // Starter questions from the phone, with the "how does this work" one first.
  useEffect(() => {
    if (!open || loadedSuggestions.current) return;
    loadedSuggestions.current = true;
    fetchSuggestions()
      .then((list) => {
        if (list.length) setSuggestions([PHONE_QUESTION, ...list.filter((q) => q !== PHONE_QUESTION)]);
      })
      .catch(() => {});
  }, [open]);

  // Shrink the desktop pill to a circle while the footer is on screen.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // A one-time hello on desktop, only when Pixel is actually online.
  useEffect(() => {
    if (mobile || open || state !== "online" || readFlag(NUDGE_KEY)) return;
    const show = setTimeout(() => {
      setNudge(true);
      setFlag(NUDGE_KEY);
    }, 4000);
    return () => clearTimeout(show);
  }, [mobile, open, state]);
  useEffect(() => {
    if (!nudge) return;
    const hide = setTimeout(() => setNudge(false), 8000);
    return () => clearTimeout(hide);
  }, [nudge]);

  // Focus: the text box on desktop, the close button on phones (so the keyboard doesn't pop up).
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => (mobile ? closeRef.current : composerRef.current)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, mobile]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Esc stops an answer first, then closes. On phones, Tab stays inside the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (chat.busy) chat.stop();
        else closeChat();
        return;
      }
      if (e.key === "Tab" && mobile && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, mobile, chat, closeChat]);

  // The full-screen sheet on phones shouldn't let the page scroll underneath.
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, mobile]);

  const compact = mobile || footerVisible;
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : mobile
      ? {
          initial: { y: "100%" },
          animate: { y: 0 },
          exit: { y: "100%" },
          transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const },
        }
      : {
          initial: { opacity: 0, y: 16, scale: 0.96 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.15 } },
          transition: { type: "spring" as const, stiffness: 380, damping: 30 },
        };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            key="launcher"
            className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 400, damping: 28, delay: wasOpen.current ? 0 : 1.2 }}
          >
            <AnimatePresence>
              {nudge && (
                <motion.div
                  className="absolute right-0 bottom-full mb-3 hidden w-60 rounded-xl border bg-popover p-3 pr-8 text-sm text-popover-foreground shadow-lg sm:block"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  role="status"
                >
                  <button
                    type="button"
                    onClick={() => setNudge(false)}
                    className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="size-3.5" />
                  </button>
                  <strong className="font-semibold">Hi, I'm Pixel.</strong> I answer questions about Bhawar, from a phone on his desk.
                </motion.div>
              )}
            </AnimatePresence>

            <button
              ref={launcherRef}
              type="button"
              onClick={openChat}
              aria-expanded={open}
              aria-controls={PANEL_ID}
              aria-label={`Ask Pixel, chat assistant (${STATE_LABEL[state]})`}
              className={cn(
                "relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-lg outline-none transition-[transform,width,padding] hover:scale-[1.03] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
                compact ? "w-12" : "pr-5 pl-4",
              )}
            >
              <Smartphone className="size-4" aria-hidden="true" />
              <span className={cn(compact && "sr-only")}>Ask Pixel</span>
              <StatusDot state={state} pulse className="-top-0.5 -right-0.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            id={PANEL_ID}
            role="dialog"
            aria-label="Chat with Pixel"
            aria-modal={mobile || undefined}
            className={cn(
              "fixed z-[60] flex flex-col overflow-hidden bg-background text-foreground",
              mobile
                ? "inset-0 h-dvh"
                : "right-6 bottom-6 h-[min(600px,calc(100dvh-6rem))] w-[400px] rounded-2xl border shadow-2xl dark:shadow-black/60",
            )}
            style={mobile ? undefined : { transformOrigin: "bottom right" }}
            {...panelMotion}
          >
            <ChatPanel
              status={status}
              state={state}
              chat={chat}
              suggestions={suggestions}
              draft={draft}
              setDraft={setDraft}
              mobile={mobile}
              onClose={closeChat}
              composerRef={composerRef}
              closeRef={closeRef}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
