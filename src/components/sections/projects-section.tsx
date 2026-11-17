import { motion } from "motion/react";
import { ArrowUpRight, Github, MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusDot } from "@/components/chat/status-dot";
import { STATE_LABEL } from "@/hooks/use-pixel-status";
import { usePixelSnapshot } from "@/lib/pixel-store";
import { openPixelChat } from "@/lib/pixel-events";
import { revealAt } from "@/lib/motion";
import { pixelProject, projects, type Project } from "@/lib/data";

const cardClass =
  "group flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-card transition-[border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-foreground/25";

function ProjectLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {children}
    </a>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <motion.article
      {...revealAt(index % 3)}
      className={cardClass}
    >
      <div className="aspect-[16/10] overflow-hidden border-b bg-muted">
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold tracking-tight">{project.title}</h3>
        <p className="mt-2 text-muted-foreground">{project.blurb}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{project.tags.join(" · ")}</p>
        {(project.github || project.demo) && (
          <div className="mt-auto flex gap-4 pt-5">
            {project.github && (
              <ProjectLink href={project.github}>
                <Github className="size-4" aria-hidden="true" />
                Code<span className="sr-only"> for {project.title}</span>
              </ProjectLink>
            )}
            {project.demo && (
              <ProjectLink href={project.demo}>
                <ArrowUpRight className="size-4" aria-hidden="true" />
                {project.demoLabel ?? "Demo"}
                <span className="sr-only"> of {project.title}</span>
              </ProjectLink>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

/** The chatbot side project. Its picture is drawn in code, and "Try it" opens the chat. */
function PixelProjectCard() {
  const { state } = usePixelSnapshot();
  return (
    <motion.article {...revealAt(0)} className={cardClass}>
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border-b bg-muted">
        <div className="dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
        {/* a little phone with a conversation on it */}
        <div
          className="relative flex h-[78%] aspect-[9/17] flex-col gap-1.5 rounded-[1.1rem] border-[3px] border-foreground/85 bg-card px-2 pt-4 pb-2 transition-transform duration-500 group-hover:scale-[1.03]"
          aria-hidden="true"
        >
          <span className="absolute top-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-foreground/80" />
          <span className="h-2.5 w-4/5 self-end rounded-full bg-brand" />
          <span className="h-2.5 w-3/4 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-1/2 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-3/5 self-end rounded-full bg-brand" />
          <span className="h-2.5 w-2/3 rounded-full bg-foreground/15" />
        </div>
        <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border bg-card/90 px-2.5 py-1 text-xs backdrop-blur-sm">
          <span className="relative flex size-2.5">
            <StatusDot state={state} className="relative size-2.5 ring-0" />
          </span>
          {STATE_LABEL[state]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold tracking-tight">{pixelProject.title}</h3>
        <p className="mt-2 text-muted-foreground">{pixelProject.blurb}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{pixelProject.tags.join(" · ")}</p>
        <div className="mt-auto flex gap-4 pt-5">
          <button
            type="button"
            onClick={() => openPixelChat()}
            className="inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Try it
          </button>
          <ProjectLink href={pixelProject.github}>
            <Github className="size-4" aria-hidden="true" />
            Code<span className="sr-only"> for {pixelProject.title}</span>
          </ProjectLink>
        </div>
      </div>
    </motion.article>
  );
}

export default function ProjectsSection() {
  return (
    <section id="projects">
      <div className="section-container">
        <SectionHeading index="03" label="Projects" title="Things I've built" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* The chatbot is one side project among many: it opens the second row. */}
          {projects.slice(0, 3).map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
          <PixelProjectCard />
          {projects.slice(3).map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i + 4} />
          ))}
        </div>
      </div>
    </section>
  );
}
