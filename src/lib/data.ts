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
      "It is a complete school management solution designed to simplify administration, improve communication, and enhance the student learning experience. It has features like calendar generation, attendance tracking, and grade management for both teachers and students while only admin can add new students and teachers. All this data is stored in a OracleDB which is connected using JDBC. It also include games like tic tac toe and bagels to make learning fun for students.",
    image: "./SchoolManagementSystem.svg",
    tags: ["Java 8", "OracleDB", "JDBC"],
    github: "https://github.com/BhawarGujral/Apna-School",
    demo: "https://docs.google.com/presentation/d/1FFrv-56V24nG4mABR2khXp3iMF79IsNZ/edit?usp=sharing&ouid=103501319821404535178&rtpof=true&sd=true",
  },
  {
    id: "project-2",
    title: "Flappy Bird Game",
    description:
      "It is a clone of the popular Flappy Bird game built with Java 7 and JavaFX. It stores the user high scores locally using file I/O operations. It also have the feature to control the speed of the bird. Gave me a hands-on experience with JavaFX and event-driven programming.",
    image: "./FlappyBird.svg",
    tags: ["Java", "JavaFX", "Java Swing"],
    github: "https://github.com/BhawarGujral/FlappyBird",
    demo: "https://drive.google.com/file/d/1nZ_rpjvW0_limgi8q_ADylWE7Vugm-hb/view",
  },
  {
    id: "project-3",
    title: "E-commerce Mobile Applications",
    description:
      "It is associated with my internship at HRX-Connect. This Application is built using React Native for frontend and Firebase, AWS for backend. It had a seamless user experience for both vendors and users. It features user authentication using firebase, product browsing, shopping cart, Stripe payments for checkout,and order management functionalities.",
    image: "./EcomMobileApp.svg",
    tags: [
      "TypeScript",
      "React Native",
      "TailWind CSS",
      "Node.js",
      "Firebase",
      "AWS Integration",
      "Stripe",
      "AWS",
    ],
  },
  {
    id: "project-4",
    title: "Expense Manager",
    description:
      "It is a android application built using Kotlin, Android UI and with the Backend built using Springboot framework and Postgresql database. It helps users to manage their daily expenses by adding, updating and deleting expenses. It also provides a graphical representation of the expenses using charts and graphs. It also let users to add friends and share expenses with them. It also provides authentication and authorization using JWT tokens. Backend is deployed on Railways using a free tier account. Give me a hands-on-experience with springboot and JWT token generation.",
    image: "./ExpenseManager.svg",
    tags: ["Kotlin", "Springboot", "Postgresql", "JWT", "REST API", "Railways"],
    github: "https://github.com",
    demo: "https://example.com",
  },
  {
    id: "project-5",
    title: "Emotion Detector Application",
    description:
      "This application detects human emotions using facial recognition and machine learning techniques.",
    image: "./EmotionDetector.svg",
    tags: [
      "Java",
      "Android",
      "Machine Learning",
      "OpenCV",
      "Firebase",
      "REST API",
    ],
    github: "https://github.com",
    demo: "https://example.com",
  },
  {
    id: "project-6",
    title: "Weather Application",
    description:
      "This application provides weather updates using API integration.",
    image: "./WeatherApp.svg",
    tags: ["Java", "Android", "openWeatherMap API", "JSON Parsing"],
    github: "https://github.com",
    demo: "https://example.com",
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
