import { FaJava, FaReact, FaNodeJs, FaAws } from "react-icons/fa";
import {
  SiJavascript,
  SiTypescript,
  SiPython,
  SiPostgresql,
  SiMongodb,
  SiSpringboot,
  SiTailwindcss,
} from "react-icons/si";
import { Terminal } from "lucide-react"; // Lucide icons
import { IconType } from "react-icons";
import { LucideIcon } from "lucide-react";

export type ExperienceMetric = {
  label: string;
  value: number;
  suffix?: string;
  srLabel: string; // screen-reader label (for <dt>)
};

export const experienceMetrics: ExperienceMetric[] = [
  {
    label: "Years",
    value: 3,
    suffix: "+",
    srLabel: "Years of experience",
  },
  {
    label: "Projects",
    value: 12,
    suffix: "+",
    srLabel: "Projects delivered",
  },
  {
    label: "Clients",
    value: 5,
    suffix: "+",
    srLabel: "Clients served",
  },
  {
    label: "Certifications",
    value: 5,
    srLabel: "Certifications",
  },
];

export type Project = {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  github?: string;
  demo?: string;
};

export const projects: Project[] = [
  {
    id: "project-1",
    title: "School Management System",
    description:
      "APNA SCHOOL is a complete school management solution designed to simplify administration, improve communication, and enhance the student learning experience.",
    image: "./projectDemo.svg",
    tags: ["React", "Node.js", "MongoDB", "Stripe"],
    github: "https://github.com",
    demo: "https://example.com",
  },
  {
    id: "project-2",
    title: "Project 2",
    description: "Lorem Ipsum is simply dummy text",
    image: "./projectDemo.svg",
    tags: ["React", "TypeScript", "Firebase", "Tailwind CSS"],
    github: "https://github.com",
    demo: "https://example.com",
  },
  {
    id: "project-3",
    title: "Project 3",
    description: "Lorem Ipsum is simply dummy text",
    image: "./projectDemo.svg",
    tags: ["JavaScript", "API Integration", "Chart.js", "CSS"],
    github: "https://github.com",
  },
  {
    id: "project-4",
    title: "Project 4",
    description: "Lorem Ipsum is simply dummy text",
    image: "./projectDemo.svg",
    tags: ["React", "Node.js", "MongoDB", "Stripe"],
    github: "https://github.com",
    demo: "https://example.com",
  },
  {
    id: "project-5",
    title: "Project 5",
    description: "Lorem Ipsum is simply dummy text",
    image: "./projectDemo.svg",
    tags: ["React", "TypeScript", "Firebase", "Tailwind CSS"],
    github: "https://github.com",
    demo: "https://example.com",
  },
  {
    id: "project-6",
    title: "Project 6",
    description: "Lorem Ipsum is simply dummy text",
    image: "./projectDemo.svg",
    tags: ["JavaScript", "API Integration", "Chart.js", "CSS"],
    github: "https://github.com",
  },
];

export type Skill = {
  name: string;
  level: number;
  icon: IconType | LucideIcon;
};

// --------------------
// Essential Skills Only
// --------------------
export const manualSkills: Skill[] = [
  // Core Programming Languages
  { name: "JavaScript", level: 95, icon: SiJavascript },
  { name: "TypeScript", level: 85, icon: SiTypescript },
  { name: "Java", level: 90, icon: FaJava },
  { name: "Python", level: 80, icon: SiPython },

  // Frontend & UI
  { name: "React.js", level: 90, icon: FaReact },
  { name: "Tailwind CSS", level: 85, icon: SiTailwindcss },

  // Backend & APIs
  { name: "Node.js", level: 85, icon: FaNodeJs },
  { name: "Spring Boot", level: 80, icon: SiSpringboot },
  { name: "REST API", level: 85, icon: Terminal },

  // Databases
  { name: "PostgreSQL", level: 85, icon: SiPostgresql },
  { name: "MongoDB", level: 80, icon: SiMongodb },

  // Cloud & DevOps
  { name: "AWS", level: 70, icon: FaAws },
];

export const skills = manualSkills;

/**
 * This code is for extracting skills from projects currently not in use.
 * for use it remove above line and use below code it also merge manually
 * added skills
 * 
// --------------------
// Icon Map (auto for project tags)
// --------------------
const skillIconMap: Record<string, any> = {
  React: FaReact,
  "Node.js": FaNodeJs,
  MongoDB: SiMongodb,
  Firebase: SiFirebase,
  "TypeScript": SiTypescript,
  "JavaScript": SiJavascript,
  "Tailwind CSS": SiTailwindcss,
}

function calculateLevel(count: number): number {
  if (count >= 5) return 95
  if (count === 4) return 90
  if (count === 3) return 80
  if (count === 2) return 70
  return 60 // default for 1 project
}

function extractSkillsFromProjects(projects: Project[]): Skill[] {
  const tagCounts: Record<string, number> = {}

  projects.forEach((project) => {
    project.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  return Object.entries(tagCounts).map(([tag, count]) => ({
    name: tag,
    level: calculateLevel(count),
    icon: skillIconMap[tag] || Code2,
  }))
}

const autoSkills: Skill[] = extractSkillsFromProjects(projects)

export const skills: Skill[] = [
  ...manualSkills,
  ...autoSkills.filter(
    (auto) =>
    !manualSkills.some(
    (manual) => manual.name.toLowerCase() === auto.name.toLowerCase()
    )
    ),
    ]
*/
