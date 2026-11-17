import { motion } from "motion/react";
import { SectionHeading } from "@/components/ui/section-heading";
import { ChipList, MonoLabel, Tile } from "@/components/ui/tile";
import { revealAt } from "@/lib/motion";
import { dailyDrivers, domains, skillGroups } from "@/lib/data";

const MotionTile = motion.create(Tile);

export default function SkillsSection() {
  return (
    <section id="skills">
      <div className="section-container">
        <SectionHeading index="04" label="Skills" title="What I reach for">
          No percentage bars. Here's what I use every day, and what else I've shipped with.
        </SectionHeading>

        <MotionTile {...revealAt(0)} className="border-l-4 border-l-brand">
          <MonoLabel>daily drivers</MonoLabel>
          <ChipList
            items={dailyDrivers}
            className="mt-4 gap-2.5"
            chipClassName="border-transparent bg-secondary px-4 py-2 text-base font-medium text-secondary-foreground"
          />
        </MotionTile>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((group, i) => (
            <MotionTile key={group.title} {...revealAt(i + 1)} className="p-6 sm:p-6">
              <h3 className="font-semibold">{group.title}</h3>
              <ChipList items={group.items} className="mt-4 gap-1.5" chipClassName="px-2.5 py-0.5 text-[0.825rem]" />
            </MotionTile>
          ))}
        </div>

        <motion.div {...revealAt(5)} className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <MonoLabel>domains</MonoLabel>
          <p className="text-muted-foreground">{domains.join(" · ")}</p>
        </motion.div>
      </div>
    </section>
  );
}
