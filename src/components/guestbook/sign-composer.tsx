import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkName, GuestbookError, MAX_NAME_LENGTH, type GuestbookEntry } from "@/lib/guestbook";

const NETWORK_ERROR = "Couldn't reach the wall. My phone might be napping, try again in a bit.";

type Props = {
  disabled: boolean;
  hidden: boolean; // returning signers don't see the form
  onSign: (name: string, website: string) => Promise<GuestbookEntry>;
  onAnnounce: (text: string) => void;
};

/** The "sign the wall" pill floating at the top of the wall. */
export function SignComposer({ disabled, hidden, onSign, onAnnounce }: Props) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

  useEffect(() => {
    if (!thanks) return;
    const timer = setTimeout(() => setThanks(null), 4000);
    return () => clearTimeout(timer);
  }, [thanks]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = checkName(name);
    if (problem) {
      setError(problem);
      onAnnounce(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const entry = await onSign(name, website);
      setThanks(`Thanks, ${entry.name}. You're on the wall.`);
      onAnnounce("Your signature is on the wall.");
      setName("");
    } catch (err) {
      const message = err instanceof GuestbookError ? err.message : NETWORK_ERROR;
      setError(message);
      onAnnounce(message);
    } finally {
      setBusy(false);
    }
  };

  if (hidden && !thanks) return null;

  return (
    <div
      data-board-ui
      className="absolute top-3 left-1/2 z-20 w-[min(92%,24rem)] -translate-x-1/2"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <AnimatePresence mode="wait" initial={false}>
        {thanks ? (
          <motion.p
            key="thanks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mx-auto w-fit rounded-full border bg-background/90 px-4 py-2 text-sm font-medium shadow-md backdrop-blur"
          >
            {thanks}
          </motion.p>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={submit}
            noValidate
            className="relative flex items-center gap-1.5 rounded-full border bg-background/90 p-1.5 shadow-md backdrop-blur focus-within:ring-[3px] focus-within:ring-ring/50"
          >
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={disabled ? "The wall is asleep" : "Your name or initials"}
              aria-label="Your name or initials"
              aria-invalid={error ? true : undefined}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
              enterKeyHint="send"
              disabled={busy || disabled}
              className="h-9 min-w-0 flex-1 rounded-full bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm"
            />
            {/* Honeypot: hidden from people, tempting for bots. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <Button type="submit" className="h-9 rounded-full px-4" disabled={busy || disabled}>
              {busy ? <LoaderCircle className="animate-spin" /> : <PenLine />}
              Sign
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      {error && (
        <p className="mx-auto mt-2 w-fit rounded-full border bg-background px-3 py-1 text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
