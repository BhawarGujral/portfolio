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
    value: 15,
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
    suffix: "+",
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
    title: "E-commerce Mobile Applications",
    description:
      "It is associated with my internship at HRX-Connect. This Application is built using React Native for frontend and Firebase, AWS for backend. It had a seamless user experience for both vendors and users. It features user authentication using firebase, product browsing, shopping cart, Stripe payments for checkout,and order management functionalities.",
    image: "/portfolio/EcomMobileApp.svg",
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
    id: "project-2",
    title: "Expense Manager",
    description:
      "It is a android application built using Kotlin, Android UI and with the Backend built using Springboot framework and Postgresql database. It helps users to manage their daily expenses by adding, updating and deleting expenses. It also provides a graphical representation of the expenses using charts and graphs. It also let users to add friends and share expenses with them. It also provides authentication and authorization using JWT tokens. Backend is deployed on Railways using a free tier account. Give me a hands-on-experience with springboot and JWT token generation.",
    image: "/portfolio/ExpenseManager.svg",
    tags: ["Kotlin", "Springboot", "Postgresql", "JWT", "REST API", "Railways"],
    demo: "https://vimeo.com/1123028426?share=copy",
  },
  {
    id: "project-3",
    title: "Smart Home Manager",
    description:
      "This project is a Spring Boot-based Home User Service application designed to manage users, devices, and automation features for a smart home system. It provides RESTful APIs and web interfaces for user registration, authentication, device management, and notification handling. The application follows a modular structure with separate packages for configuration, controllers, models, repositories, and services. It uses Thymeleaf templates for the frontend and supports both admin and user dashboards. The project is built with Maven and includes resources for static content and templates to deliver a complete smart home management experience.",
    image: "/portfolio/SmartHomeManager.svg",
    tags: [
      "Java",
      "Spring Boot",
      "Thymeleaf",
      "REST API",
      "Maven",
      "MySQL",
      "Hibernate",
    ],
    github: "https://github.com/BhawarGujral/SmartHomeManagerSpring",
  },
  {
    id: "project-4",
    title: "Twitter Spring Boot Clone",
    description:
      "TwitterSpring is a Java-based web application built with the Spring Boot framework that emulates core functionalities of Twitter, including user management and tweet posting. The project demonstrates a clean architecture with layered separation of concerns, utilizing Spring Data JPA for database interactions and RESTful controllers for API endpoints. It features entity modeling for users, tweets, and addresses, and provides a robust foundation for scalable social media applications. This project highlights my proficiency in modern Java development, REST API design, and enterprise application structuring, making it an excellent showcase of my backend engineering skills.",
    image: "/portfolio/TwitterSpring.svg",
    tags: [
      "Java",
      "Spring Boot",
      "REST API",
      "JPA",
      "Maven",
      "MySQL",
      "Hibernate",
    ],
    github: "https://github.com/BhawarGujral/TwitterSpring",
  },
  {
    id: "project-5",
    title: "MovieRating.io",
    description:
      "It is an iOS application designed to help users discover, search, and manage their favorite movies with ease. Featuring a clean and intuitive interface, the app allows users to browse trending films, search for specific titles, and curate a personalized list of favorites. Leveraging Core Data for persistent storage and custom table and collection views for a rich user experience, It demonstrates strong architectural organization and modern Swift development practices, making it a robust showcase of mobile app design and functionality.",
    image: "/portfolio/MovieRating.svg",
    tags: ["Swift", "iOS", "Core Data", "API", "MVVM", "JSON"],
    github: "https://github.com/BhawarGujral/MovieRating.io",
    demo: "https://vimeo.com/1118405057?share=copy#t=0",
  },
  {
    id: "project-6",
    title: "Emotion Detector Application",
    description:
      "Emotion Detector is an Android application designed to analyze and recognize facial expressions in real time. Built with modern Android development practices, the app leverages advanced image processing and machine learning techniques to accurately detect a range of human emotions from camera input.",
    image: "/portfolio/EmotionDetector.svg",
    tags: [
      "Java",
      "Android",
      "Machine Learning",
      "OpenCV",
      "Firebase",
      "REST API",
    ],
    github: "https://github.com/BhawarGujral/ExpressionDetection",
    demo: "https://example.com",
  },
  {
    id: "project-7",
    title: "Flappy Bird Game",
    description:
      "It is a clone of the popular Flappy Bird game built with Java 7 and JavaFX. It stores the user high scores locally using file I/O operations. It also have the feature to control the speed of the bird. Gave me a hands-on experience with JavaFX and event-driven programming.",
    image: "/portfolio/FlappyBird.svg",
    tags: ["Java", "JavaFX", "Java Swing"],
    github: "https://github.com/BhawarGujral/FlappyBird",
    demo: "https://vimeo.com/1118386921?share=copy#t=0",
  },
  {
    id: "project-8",
    title: "School Management System",
    description:
      "It is a complete school management solution designed to simplify administration, improve communication, and enhance the student learning experience. It has features like calendar generation, attendance tracking, and grade management for both teachers and students while only admin can add new students and teachers. All this data is stored in a OracleDB which is connected using JDBC. It also include games like tic tac toe and bagels to make learning fun for students.",
    image: "/portfolio/SchoolManagementSystem.svg",
    tags: ["Java 8", "OracleDB", "JDBC"],
    github: "https://github.com/BhawarGujral/Apna-School",
    demo: "https://docs.google.com/presentation/d/1FFrv-56V24nG4mABR2khXp3iMF79IsNZ/edit?usp=sharing&ouid=103501319821404535178&rtpof=true&sd=true",
  },
  {
    id: "project-9",
    title: "Weather Application",
    description:
      "The Weather App is as native Android application that provides users with real-time weather updates and forecasts in a straightforward, functional interface. While the app reliably delivers accurate, location-based weather information such as temperature, humidity, and atmospheric conditions, its UI/UX is intentionally kept simple and minimalistic, focusing on core functionality rather than advanced design elements. This project highlights skills in Android app development, API integration, and Gradle-based build automation, serving as a solid demonstration of technical proficiency in mobile application development, even though the user interface is basic.",
    image: "/portfolio/WeatherApp.svg",
    tags: ["Java", "Android", "openWeatherMap API", "JSON Parsing"],
    github: "https://github.com/BhawarGujral/weather-app",
    demo: "https://vimeo.com/1118386526?share=copy#t=0",
  },
];

export type Skill = {
  name: string;
  level: number;
  icon: IconType | LucideIcon;
};

export const manualSkills: Skill[] = [
  { name: "JavaScript", level: 95, icon: SiJavascript },
  { name: "TypeScript", level: 85, icon: SiTypescript },
  { name: "Java", level: 90, icon: FaJava },
  { name: "Python", level: 80, icon: SiPython },

  { name: "React.js", level: 90, icon: FaReact },
  { name: "Tailwind CSS", level: 85, icon: SiTailwindcss },

  { name: "Node.js", level: 85, icon: FaNodeJs },
  { name: "Spring Boot", level: 80, icon: SiSpringboot },
  { name: "REST API", level: 85, icon: Terminal },

  { name: "PostgreSQL", level: 85, icon: SiPostgresql },
  { name: "MongoDB", level: 80, icon: SiMongodb },

  { name: "AWS", level: 70, icon: FaAws },
];

export const skills = manualSkills;
