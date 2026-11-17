import { motion } from "motion/react";
import { Award, GraduationCap } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { MonoLabel, Tile } from "@/components/ui/tile";
import { reveal, revealAt } from "@/lib/motion";
import { certifications, education, experience } from "@/lib/data";
import { cn } from "@/lib/utils";

const MotionTile = motion.create(Tile);

export default function ExperienceSection() {
  return (
    <section id="experience">
      <div className="section-container">
        <SectionHeading index="02" label="Experience" title="Where I've worked" />

        {/* The career as a route: a dashed line with a stop for each role. */}
        <ol className="relative">
          {experience.map((role, i) => (
            <motion.li
              key={role.id}
              {...reveal}
              className="relative grid gap-x-12 pb-12 pl-8 last:pb-0 md:grid-cols-[10rem_1fr] md:pl-0"
            >
              {/* the route segment and its stop */}
              <span
                className={cn(
                  "absolute top-2 bottom-0 left-[5px] border-l-2 border-dashed border-brand/70 md:left-[calc(10rem+1.5rem-1px)]",
                  i === experience.length - 1 && "hidden",
                )}
                aria-hidden="true"
              />
              <span
                className="absolute top-1.5 left-0 flex size-3 md:left-[calc(10rem+1.5rem-6px)]"
                aria-hidden="true"
              >
                {role.current && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" />
                )}
                <span
                  className={cn(
                    "relative size-3 rounded-full border-2",
                    role.current ? "border-brand bg-brand" : "border-foreground/70 bg-background",
                  )}
                />
              </span>

              <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase md:pt-1">
                {role.start} – {role.end}
              </p>
              <div className="mt-1 min-w-0 md:mt-0">
                <h3 className="text-xl font-semibold tracking-tight">{role.title}</h3>
                <p className="mt-0.5 text-muted-foreground">
                  {role.company} · {role.location}
                </p>
                <ul className="mt-4 space-y-2 text-[0.975rem] text-muted-foreground">
                  {role.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-[0.6em] size-1 shrink-0 rounded-full bg-foreground/40" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-xs text-muted-foreground">{role.stack.join(" · ")}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          <MotionTile {...revealAt(0)}>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-brand-ink" aria-hidden="true" />
              <MonoLabel>education</MonoLabel>
            </div>
            <ul className="mt-5 space-y-5">
              {education.map((e) => (
                <li key={e.credential}>
                  <p className="font-semibold">{e.credential}</p>
                  <p className="text-muted-foreground">
                    {e.school} · {e.years}
                  </p>
                  {e.note && <p className="mt-1 text-sm text-muted-foreground">{e.note}</p>}
                </li>
              ))}
            </ul>
          </MotionTile>

          <MotionTile {...revealAt(1)}>
            <div className="flex items-center gap-2">
              <Award className="size-5 text-brand-ink" aria-hidden="true" />
              <MonoLabel>certifications</MonoLabel>
            </div>
            <ul className="mt-5 divide-y divide-dashed">
              {certifications.map((c) => (
                <li key={c.name} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <span className="min-w-0 text-[0.95rem]">{c.name}</span>
                  <span className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
                    {c.issuer}
                  </span>
                </li>
              ))}
            </ul>
          </MotionTile>
        </div>
      </div>
    </section>
  );
}
