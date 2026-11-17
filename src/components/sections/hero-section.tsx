import { motion } from "motion/react";
import { ArrowDown, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPhotos } from "@/components/sections/hero-photos";
import { EASE_OUT } from "@/lib/motion";
import { links } from "@/lib/data";

export default function HeroSection() {
  return (
    <section id="home" className="relative isolate overflow-hidden">
      {/* dot grid, fading out from the top right */}
      <div
        className="dot-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto grid min-h-[100svh] max-w-6xl items-center gap-12 px-5 pt-28 pb-16 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="min-w-0">
          {/* The headline is visible on first paint (no fade) so it isn't held back. */}
          <h1>
            <span className="mb-5 flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
              Bhawar Gujral · <span className="hidden sm:inline">Full-stack developer · </span>Toronto
            </span>
            <span className="block text-[clamp(2.5rem,7vw,5rem)] leading-[0.98] font-bold tracking-[-0.03em] text-balance">
              <span className="block">Hi, I'm Bhawar.</span>I build software{" "}
              <span className="bg-[linear-gradient(var(--brand),var(--brand))] bg-[length:100%_0.18em] bg-[position:0_92%] bg-no-repeat box-decoration-clone">
                end to end.
              </span>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Full-stack developer in Toronto, working on banking systems with Java, Spring Boot, React and Angular.
            Off the clock I'm traveling, listening to podcasts, or building something new with AI.
          </p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT }}
          >
            <Button
              size="lg"
              className="h-11 rounded-full bg-brand px-6 text-brand-foreground hover:bg-brand/90"
              asChild
            >
              <a href="#projects">See my work</a>
            </Button>
            <Button size="lg" variant="outline" className="h-11 rounded-full px-6" asChild>
              <a href="#contact">Get in touch</a>
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-11 rounded-full" asChild>
                <a href={links.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                  <Github className="size-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="size-11 rounded-full" asChild>
                <a href={links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <Linkedin className="size-5" />
                </a>
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[420px] min-w-0"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
        >
          {/* a marigold card peeking out behind the photo */}
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] bg-brand" aria-hidden="true" />
          <HeroPhotos />
        </motion.div>
      </div>

      <a
        href="#about"
        aria-label="Scroll to About"
        className="absolute bottom-6 left-1/2 hidden size-10 -translate-x-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground lg:flex"
      >
        <ArrowDown className="size-5 motion-safe:animate-bounce" />
      </a>
    </section>
  );
}
