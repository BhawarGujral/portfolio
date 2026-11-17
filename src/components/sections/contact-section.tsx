import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reveal } from "@/lib/motion";
import { links } from "@/lib/data";

export default function ContactSection() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(links.email);
      setCopied(true);
    } catch {
      // Clipboard blocked: the visible address is still selectable.
    }
  };

  return (
    <section id="contact">
      <div className="section-container">
        <motion.div
          {...reveal}
          className="relative isolate overflow-hidden rounded-3xl border bg-card px-6 py-12 text-center sm:px-14 sm:py-16"
        >
          <div
            className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_75%)]"
            aria-hidden="true"
          />
          <p className="flex items-center justify-center gap-2 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            06 / Contact
          </p>
          <h2 className="mt-4 text-[clamp(1.875rem,4vw,3rem)] leading-tight font-semibold tracking-[-0.02em]">
            Let's build something.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            I'm open to new opportunities and collaborations. Email is the fastest way to reach me, or say hi on
            LinkedIn.
          </p>

          <a
            href={`mailto:${links.email}`}
            className="mt-8 inline-block text-xl font-semibold break-all underline decoration-brand decoration-2 underline-offset-[6px] transition-colors hover:text-brand-ink sm:text-3xl"
          >
            {links.email}
          </a>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" className="h-10 rounded-full px-4" onClick={copyEmail}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              <span aria-live="polite">{copied ? "Copied" : "Copy email"}</span>
            </Button>
            <Button variant="outline" className="h-10 rounded-full px-4" asChild>
              <a href={links.linkedin} target="_blank" rel="noreferrer">
                <Linkedin aria-hidden="true" />
                LinkedIn
              </a>
            </Button>
            <Button variant="outline" className="h-10 rounded-full px-4" asChild>
              <a href={links.github} target="_blank" rel="noreferrer">
                <Github aria-hidden="true" />
                GitHub
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
