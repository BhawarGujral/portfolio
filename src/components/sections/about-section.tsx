import { motion } from "motion/react";
import { Headphones, Sparkles, Video } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ChipList, MonoLabel, Tile } from "@/components/ui/tile";
import { RouteLine } from "@/components/ui/route-line";
import { revealAt } from "@/lib/motion";
import { certifications, experience, projects, travel } from "@/lib/data";

const MotionTile = motion.create(Tile);

const now = [
  { label: "based in", value: "Toronto, Canada" },
  { label: "working on", value: "Banking systems at TCS" },
  { label: "learning", value: "Building AI apps and agents" },
  { label: "side project", value: "A chatbot on my spare Pixel 7" },
  { label: "speaks", value: "English and Hindi" },
];

const numbers = [
  { value: "2022", label: "writing code professionally since" },
  { value: String(experience.length), label: "roles, India to Toronto" },
  { value: String(projects.length + 1), label: "personal projects" },
  { value: String(certifications.length), label: "certifications" },
];

export default function AboutSection() {
  return (
    <section id="about">
      <div className="section-container">
        <SectionHeading index="01" label="About" title="The short version" />

        <div className="grid gap-4 lg:grid-cols-6">
          <MotionTile {...revealAt(0)} className="lg:col-span-4">
            <div className="space-y-4 text-lg leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
              <p>
                I'm a <strong>full-stack developer in Toronto</strong>. Most days that means Java and Spring Boot
                services with React or Angular on top, lately on banking systems where testing, security and
                performance aren't optional.
              </p>
              <p>
                I grew up in <strong>Ludhiana, Punjab</strong>, and started out as a Java developer there. In 2023 I
                left that job to study in Canada. It was a real gamble, and it paid off when I landed my first
                developer role here.
              </p>
              <p>
                I used to be the quiet one in the room. These days I deliberately pick the thing that makes me a
                little nervous, whether that's <strong>moving across the world</strong> or putting my work out
                there online.
              </p>
            </div>
          </MotionTile>

          <MotionTile {...revealAt(1)} className="flex flex-col lg:col-span-2 lg:row-span-2">
            <MonoLabel>right now</MonoLabel>
            <dl className="mt-5 flex flex-1 flex-col justify-between gap-4">
              {now.map((row) => (
                <div key={row.label} className="border-t border-dashed pt-3">
                  <dt className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">{row.label}</dt>
                  <dd className="mt-0.5 font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </MotionTile>

          <MotionTile {...revealAt(2)} className="flex flex-col lg:col-span-2">
            <MonoLabel>the route so far</MonoLabel>
            <div className="flex flex-1 items-center py-4">
              <RouteLine
                title="From Ludhiana, through the 2023 move, to Toronto"
                width={300}
                height={110}
                points={[
                  { x: 28, y: 70, label: "Ludhiana", sub: "Punjab", labelAt: "below" },
                  { x: 150, y: 34, label: "2023", sub: "the leap", labelAt: "above" },
                  { x: 272, y: 70, label: "Toronto", sub: "now", labelAt: "below", filled: true },
                ]}
              />
            </div>
            <p className="text-sm text-muted-foreground">One big move so far, about 11,350 km.</p>
          </MotionTile>

          <MotionTile {...revealAt(3)} className="lg:col-span-2">
            <Sparkles className="size-5 text-brand-ink" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">AI-first, hands on the keyboard</h3>
            <p className="mt-2 text-muted-foreground">
              GitHub Copilot and Claude Code are part of my daily loop. I'm collecting AI certifications, and I still
              read every diff.
            </p>
          </MotionTile>

          <MotionTile {...revealAt(4)} className="lg:col-span-2">
            <MonoLabel>on the map this year</MonoLabel>
            <ChipList items={travel.thisYear} className="mt-3" />
            <MonoLabel className="mt-5">next</MonoLabel>
            <ChipList items={travel.next} className="mt-3" chipClassName="border-dashed border-foreground/30" />
          </MotionTile>

          <MotionTile {...revealAt(5)} className="lg:col-span-2">
            <Headphones className="size-5 text-brand-ink" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Podcasts over books</h3>
            <p className="mt-2 text-muted-foreground">
              Productivity and self-improvement, mostly. Endless scrolling gave me a goldfish attention span, so
              hands-on projects are what keep me hooked.
            </p>
          </MotionTile>

          <MotionTile {...revealAt(6)} className="lg:col-span-2">
            <Video className="size-5 text-brand-ink" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Starting to post</h3>
            <p className="mt-2 text-muted-foreground">
              I'm getting into making content about tech and AI, mostly as an excuse to meet people across the
              industry.
            </p>
          </MotionTile>

          <MotionTile {...revealAt(7)} className="lg:col-span-6">
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {numbers.map((n) => (
                <div key={n.label} className="flex min-w-0 flex-col-reverse">
                  <dt className="mt-1 text-sm text-muted-foreground">{n.label}</dt>
                  <dd className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{n.value}</dd>
                </div>
              ))}
            </dl>
          </MotionTile>
        </div>
      </div>
    </section>
  );
}
