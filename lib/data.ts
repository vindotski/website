import type {
  About,
  Contact,
  Hero,
  Role,
  Service,
  Social,
} from "./types";

// Fields marked TODO are generated placeholders, to be replaced with real content

export const hero: Hero = {
  title: "Product Engineer",
  availability: "Available for frontend and product work",
  headline: "Frontend by trade, full-stack by habit, product by focus.",
};

export const about: About = {
  intro:
    "Six years building frontends for products people pay for. I built the live frontend of a B2B sportsbook that helped close a major investment, then worked across the full stack on a fashion vertical search platform. Now I'm expanding further into product roles.",
};

// Newest first
export const experience: Role[] = [
  { title: "Production", company: "Rimac Technology", years: { start: 2025 } },
  { title: "Software Engineer", company: "Interproactive", years: { start: 2024, end: 2025 } },
  { title: "Frontend Engineer", company: "Huddle Tech", years: { start: 2020, end: 2024 } },
  { title: "Frontend Developer", company: "Ulix travel", years: { start: 2020, end: 2020 } },
  { title: "Web Developer", company: "Pro Contact", years: { start: 2019, end: 2020 } },
  { title: "Software Developer", company: "Centar MCS", years: { start: 2018, end: 2019 } },
  { title: "Software Developer", company: "4th Dimension", years: { start: 2018, end: 2018 } },
];

export const contact: Contact = {
  email: "ivan@vin.ski",
  prompt: "Have a role or a product in mind?",
  callUrl: "https://calendly.com/vindotski/30min",
};

// Order: roles and contact first, then the code behind the projects, then
// design
export const socials: Social[] = [
  { name: "LinkedIn", href: "https://www.linkedin.com/in/vindotski" },
  { name: "GitHub", href: "https://github.com/vindotski" },
  { name: "Figma", href: "https://www.figma.com/@vindotski" },
];

export const services: Service[] = [
  {
    name: "Frontend",
    headline: "Interfaces that keep up.",
    line: "Real-time, data-heavy UIs with complex state, fast and built to last.",
    proof: [
      { type: "work", slug: "huddleos" },
      { type: "play", slug: "spotcraft" },
    ],
  },
  {
    name: "Product",
    headline: "From idea to MVP.",
    line: "Scope, trade-offs, shipping and measuring, the way I work, step by step.", // TODO
    proof: [
      { type: "work", slug: "kalistenio" },
      { type: "play", slug: "vinui" },
    ],
  },
  {
    name: "Fullstack",
    headline: "From the screen to the database.",
    line: "UI, API and data, built as one piece.",
    proof: [
      { type: "work", slug: "odjeca-hr" },
      { type: "play", slug: "sokobanko" },
    ],
  },
];
