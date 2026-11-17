// Everything the page says about Bhawar's work lives here.

const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

export const links = {
  email: "bhawarworkspace@gmail.com",
  linkedin: "https://www.linkedin.com/in/bhawargujral/",
  github: "https://github.com/BhawarGujral",
  repo: "https://github.com/BhawarGujral/portfolio",
};

export type Role = {
  id: string;
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  current?: boolean;
  bullets: string[];
  stack: string[];
};

export const experience: Role[] = [
  {
    id: "tcs",
    title: "Software Developer, Full Stack (Java)",
    company: "Tata Consultancy Services",
    location: "Toronto",
    start: "Dec 2025",
    end: "Present",
    current: true,
    bullets: [
      "Build Java 17 and Spring Boot microservices and REST APIs for account onboarding, mortgage workflows and core banking at a major Canadian bank.",
      "Secure services with OAuth2, JWT and SSO, wire up event messaging, and tune SQL Server and Cosmos DB queries.",
      "Ship Angular UI with Jest and Playwright coverage through Jenkins, GitHub Actions and Azure DevOps pipelines.",
    ],
    stack: ["Java 17", "Spring Boot", "Angular", "SQL Server", "Cosmos DB", "Docker"],
  },
  {
    id: "quadb",
    title: "Software Developer, Full Stack",
    company: "QuadB Technologies",
    location: "Remote",
    start: "Jan 2025",
    end: "Jul 2025",
    bullets: [
      "Built Spring Boot microservices averaging 50 ms responses.",
      "Delivered React and TypeScript frontends that loaded 30% faster, plus Node and Express APIs.",
      "Set up Docker-based CI/CD that cut release cycles by 40%, on AWS EC2, Lambda and S3.",
    ],
    stack: ["Spring Boot", "React", "TypeScript", "Node.js", "Docker", "AWS"],
  },
  {
    id: "hrxconnect",
    title: "Software Developer Intern, Full Stack",
    company: "HRXConnect",
    location: "Ontario",
    start: "Sep 2024",
    end: "Dec 2024",
    bullets: [
      "Built a React Native, Node.js and MongoDB e-commerce app with PCI-compliant Stripe payments.",
      "Added OAuth2 login with MFA that made onboarding 22% faster.",
    ],
    stack: ["React Native", "Node.js", "MongoDB", "Stripe"],
  },
  {
    id: "socket-magnate",
    title: "Java Developer",
    company: "Socket Magnate Pvt Ltd",
    location: "India",
    start: "Jan 2022",
    end: "Feb 2023",
    bullets: [
      "Migrated a legacy accounting system from Java 7 to Java 17 and built billing and tax modules.",
      "Tuned SQL to cut reporting time by 20%.",
    ],
    stack: ["Java", "SQL"],
  },
];

export type Education = { school: string; credential: string; years: string; note?: string };

export const education: Education[] = [
  {
    school: "Humber Polytechnic, Toronto",
    credential: "Postgraduate Diploma, IT Solutions",
    years: "2023–2024",
    note: "Capstone: URL Security Analytics Platform (Spring Boot, Kafka, Redis, Angular)",
  },
  {
    school: "Punjab University",
    credential: "Bachelor of Computer Applications",
    years: "2019–2022",
  },
];

export type Certification = { name: string; issuer: string };

export const certifications: Certification[] = [
  { name: "Build AI Apps and Agents with Azure", issuer: "Microsoft" },
  { name: "Copilot and Agent Administration Fundamentals", issuer: "Microsoft" },
  { name: "Azure Fundamentals", issuer: "Microsoft" },
  { name: "Career Essentials in Software Development", issuer: "Microsoft" },
  { name: "Java Foundations Professional", issuer: "JetBrains" },
  { name: "Spring Boot Microservices", issuer: "LinkedIn Learning" },
  { name: "Docker Foundations Professional", issuer: "Docker" },
  { name: "DSA and Low Level Design", issuer: "CodeHelp" },
];

export type Project = {
  id: string;
  title: string;
  blurb: string;
  image: string;
  tags: string[];
  github?: string;
  demo?: string;
  demoLabel?: string;
};

/** The chatbot side project; its card opens the chat instead of linking out. */
export const pixelProject = {
  title: "Pixel, a pocket-sized chatbot",
  blurb:
    "A fun side project: my spare Pixel 7 runs a small AI model that answers questions about me. It also hosts the guestbook below.",
  tags: ["llama.cpp", "Gemma 4", "Node.js", "Cloudflare Tunnel"],
  github: links.repo,
};

export const projects: Project[] = [
  {
    id: "ecommerce",
    title: "E-commerce Mobile App",
    blurb:
      "React Native storefront from my HRXConnect internship: vendor and shopper flows, Stripe checkout and order tracking.",
    image: asset("EcomMobileApp.svg"),
    tags: ["React Native", "TypeScript", "Node.js", "Stripe"],
  },
  {
    id: "expense-manager",
    title: "Expense Manager",
    blurb:
      "Android expense tracker with charts and bill splitting, on a Spring Boot and PostgreSQL API secured with JWT.",
    image: asset("ExpenseManager.svg"),
    tags: ["Kotlin", "Spring Boot", "PostgreSQL", "JWT"],
    demo: "https://vimeo.com/1123028426?share=copy",
  },
  {
    id: "smart-home",
    title: "Smart Home Manager",
    blurb:
      "Spring Boot service for users, devices and notifications in a smart home, with Thymeleaf admin and user dashboards.",
    image: asset("SmartHomeManager.svg"),
    tags: ["Java", "Spring Boot", "Thymeleaf", "MySQL"],
    github: "https://github.com/BhawarGujral/SmartHomeManagerSpring",
  },
  {
    id: "twitter-clone",
    title: "Twitter Clone API",
    blurb: "Layered Spring Boot REST API for users and tweets, built to get JPA modelling right.",
    image: asset("TwitterSpring.svg"),
    tags: ["Java", "Spring Boot", "JPA", "MySQL"],
    github: "https://github.com/BhawarGujral/TwitterSpring",
  },
  {
    id: "movierating",
    title: "MovieRating.io",
    blurb: "iOS app to browse trending films, search titles and save favourites offline with Core Data.",
    image: asset("MovieRating.svg"),
    tags: ["Swift", "iOS", "Core Data", "MVVM"],
    github: "https://github.com/BhawarGujral/MovieRating.io",
    demo: "https://vimeo.com/1118405057?share=copy#t=0",
  },
  {
    id: "emotion-detector",
    title: "Emotion Detector",
    blurb: "Android app that reads facial expressions from the camera in real time using OpenCV.",
    image: asset("EmotionDetector.svg"),
    tags: ["Java", "Android", "OpenCV"],
    github: "https://github.com/BhawarGujral/ExpressionDetection",
  },
  {
    id: "flappy-bird",
    title: "Flappy Bird",
    blurb: "The classic rebuilt in JavaFX, with local high scores and an adjustable speed setting.",
    image: asset("FlappyBird.svg"),
    tags: ["Java", "JavaFX"],
    github: "https://github.com/BhawarGujral/FlappyBird",
    demo: "https://vimeo.com/1118386921?share=copy#t=0",
  },
  {
    id: "school-management",
    title: "School Management System",
    blurb:
      "Attendance, grades and calendars for admins, teachers and students on Java and Oracle, with a couple of mini-games thrown in.",
    image: asset("SchoolManagementSystem.svg"),
    tags: ["Java", "Oracle", "JDBC"],
    github: "https://github.com/BhawarGujral/Apna-School",
    demo: "https://docs.google.com/presentation/d/1FFrv-56V24nG4mABR2khXp3iMF79IsNZ/edit?usp=sharing&ouid=103501319821404535178&rtpof=true&sd=true",
    demoLabel: "Slides",
  },
  {
    id: "weather-app",
    title: "Weather App",
    blurb: "Native Android app for live, location-based weather from the OpenWeatherMap API. Plain UI on purpose.",
    image: asset("WeatherApp.svg"),
    tags: ["Java", "Android", "REST API"],
    github: "https://github.com/BhawarGujral/weather-app",
    demo: "https://vimeo.com/1118386526?share=copy#t=0",
  },
];

export const dailyDrivers: string[] = [
  "Java 17",
  "Spring Boot",
  "REST microservices",
  "TypeScript",
  "React",
  "Angular",
  "SQL Server",
  "Docker",
];

export const skillGroups: { title: string; items: string[] }[] = [
  {
    title: "Backend",
    items: ["Java 8/11", "Spring MVC", "Spring Security", "Spring Data JPA", "Hibernate", "Node.js", "Express", "JUnit", "Mockito"],
  },
  {
    title: "Frontend",
    items: ["React Native", "JavaScript", "Tailwind CSS", "Jest", "Playwright"],
  },
  {
    title: "Data and messaging",
    items: ["PostgreSQL", "Oracle", "MongoDB", "Cosmos DB", "Kafka", "Solace", "Redis"],
  },
  {
    title: "Cloud and DevOps",
    items: ["Azure Kubernetes Service", "Jenkins", "GitHub Actions", "Azure DevOps", "AWS (EC2, Lambda, S3, RDS)", "Azure", "Maven", "Git"],
  },
];

export const domains: string[] = ["Banking", "Payments", "E-commerce", "SaaS", "Accounting and billing"];

export const travel = {
  thisYear: ["New York City", "Calgary", "Banff", "Jasper"],
  next: ["Las Vegas", "Montreal"],
};
