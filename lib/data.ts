import type { About, Contact, Sample, Service, Work } from "./types";

// Fields marked TODO are generated placeholders, to be replaced with real content

export const about: About = {
  intro:
    "Five years of professional frontend engineering steadily expanding into product roles for larger ownership.",
  paragraphs: [
    "I spent nearly four years at Huddle Tech building a B2B sportsbook with live match data and odds. It was presented in Las Vegas and helped close a major investment. Then I worked across the stack of Odjeca.hr, a fashion search engine, at Interproactive. Today I work in production at Rimac Technology, and I'm building Kalistenio, an app for the calisthenics I train, from scratch with a senior product designer.",
  ],
  closing:
    "I'm open to full-time frontend roles, on-site or hybrid, and to freelance product work. Let's talk.",
};

export const contact: Contact = {
  email: "ivan@vin.ski",
  prompt: "Have a role or a product in mind? Let's talk.",
};

export const services: Service[] = [
  {
    name: "Frontend",
    headline: "Interfaces that keep up.",
    line: "Real-time, data-heavy UIs with complex state, fast and built to last.",
    proof: [
      { kind: "work", slug: "huddleos" },
      { kind: "samples", slug: "dashboard" },
    ],
  },
  {
    name: "Fullstack",
    headline: "From the screen to the database.",
    line: "UI, API and data, built as one piece.",
    proof: [
      { kind: "work", slug: "odjeca-hr" },
      { kind: "samples", slug: "sokoban" },
    ],
  },
  {
    name: "Product",
    headline: "From idea to MVP.",
    line: "Scope, trade-offs, shipping and measuring, the way the Process below works.",
    proof: [
      { kind: "work", slug: "kalistenio" },
      { kind: "samples", slug: "website" },
    ],
  },
];

export const work: Work[] = [
  {
    slug: "huddleos",
    name: "HuddleOS",
    summary: "Live data. Live events. No lag.",
    company: "Huddle Tech",
    role: "Frontend Engineer",
    years: { start: 2022, end: 2025 }, // TODO
    stack: ["Vue", "GraphQL", "WebSockets"],
    productUrl: "https://huddle.tech/products/huddle-os/",
    image: { src: "/images/work/huddleos.png", alt: "HuddleOS dashboard" }, // TODO
    impact:
      "Presented on stage in Las Vegas. Helped close a major investment.",
    // TODO
    context:
      "HuddleOS runs live events in real time. Organisers watch data change as it happens and act on it straight away, so the interface has to keep up without getting in the way.",
    // TODO
    myRole:
      "I built the real-time frontend: the live views, the data layer over GraphQL and WebSockets, and the components the rest of the team built on.",
  },
  {
    slug: "odjeca-hr",
    name: "Odjeca.hr",
    summary: "Fashion search for a whole region.",
    company: "Interproactive",
    role: "Software Engineer",
    years: { start: 2021, end: 2022 }, // TODO
    stack: ["Node.js", "React", "Handlebars", "MongoDB"],
    productUrl: "https://odjeca.hr/zene",
    image: { src: "/images/work/odjeca-hr.png", alt: "Odjeca.hr search results" }, // TODO
    impact: "Thousands of shops. One search.", // TODO
    // TODO
    context:
      "Odjeca.hr is a large vertical search engine for fashion across Croatia and the Balkans. It brings products from many shops into one place to search and compare.",
    // TODO
    myRole:
      "I worked across the stack: search pages in React and Handlebars, and the Node.js and MongoDB services behind them.",
  },
  {
    slug: "kalistenio",
    name: "Kalistenio",
    summary: "Calisthenics training, in your pocket.", // TODO
    company: "Independent product",
    role: "Product Engineer", // TODO
    years: { start: 2025 }, // TODO
    stack: ["React Native", "Supabase"],
    image: { src: "/images/work/kalistenio.png", alt: "Kalistenio workout screen" }, // TODO
    impact: "From idea to app store, on my own.", // TODO
    // TODO
    context:
      "Kalistenio is a calisthenics app for people training with their own body weight. It plans workouts and tracks progress over time.",
    // TODO
    myRole:
      "Everything: product decisions, design, the React Native app and the Supabase backend.",
  },
];

export const samples: Sample[] = [
  {
    slug: "dashboard",
    name: "Dashboard",
    summary: "A data dashboard that stays fast.", // TODO
    type: "Frontend",
    stack: ["React", "TanStack"],
    year: 2026, // TODO
    status: "Live",
    demoUrl: "https://example.com/dashboard", // TODO
    sourceUrl: "https://github.com/example/dashboard", // TODO
    image: { src: "/images/samples/dashboard.png", alt: "Dashboard overview" }, // TODO
    // TODO
    why: "To see how far TanStack's query, table and router libraries go together on a data-heavy screen.",
    // TODO
    architecture:
      "A React app with TanStack Router for routing, TanStack Query for server state and TanStack Table for the data grids.",
    diagram: { src: "/images/samples/dashboard-diagram.png", alt: "Dashboard architecture" }, // TODO
    // TODO
    decisions: [
      {
        title: "Server state in TanStack Query",
        body: "Caching and refetching handled in one place, instead of a global store.",
      },
      {
        title: "Headless tables",
        body: "TanStack Table for behaviour, my own markup for the look.",
      },
    ],
    // TODO
    next: "Virtualised rows for very large tables, and saved views.",
  },
  {
    slug: "sokoban",
    name: "Sokoban",
    summary: "A classic puzzle game, rebuilt from scratch.",
    type: "Fullstack",
    stack: ["TypeScript", "Vue", "Nuxt", "Pixi", "Supabase"],
    year: 2026, // TODO
    status: "Live",
    demoUrl: "https://example.com/sokoban", // TODO
    sourceUrl: "https://github.com/example/sokoban", // TODO
    image: { src: "/images/samples/sokoban.png", alt: "Sokoban level in play" }, // TODO
    // TODO
    why: "To build a complete game end to end: rendering, game logic, and a backend for players and progress.",
    // TODO
    architecture:
      "A Nuxt app renders the game with Pixi. Game logic is plain TypeScript, separate from rendering. Supabase stores players and their progress.",
    diagram: { src: "/images/samples/sokoban-diagram.png", alt: "Sokoban architecture" }, // TODO
    // TODO
    decisions: [
      {
        title: "Game logic separate from rendering",
        body: "The rules run without Pixi, so they're easy to test and reason about.",
      },
      {
        title: "Supabase for the backend",
        body: "Auth and storage out of the box, so the time went into the game.",
      },
    ],
    // TODO
    next: "A level editor, and sharing levels with other players.",
  },
  {
    slug: "website",
    name: "Website",
    summary: "This site, built as a product.",
    type: "Product",
    stack: ["Next.js", "React", "TypeScript"],
    year: 2026,
    status: "In progress",
    demoUrl: "https://example.com", // TODO
    image: { src: "/images/samples/website.png", alt: "Portfolio home page" }, // TODO
    why: "Two audiences need different things from me. Employers hiring full time look for a frontend engineer. Freelance clients look for someone who can build a whole product.",
    architecture:
      "Next.js 16 with the App Router and Cache Components, so pages are built ahead of time. Styling is CSS Modules. Pages are built from small shared components.",
    diagram: { src: "/images/samples/website-diagram.png", alt: "Website architecture" }, // TODO
    decisions: [
      {
        title: "One story, not two",
        body: "One narrative, a frontend engineer who builds whole products, instead of separate pages per audience. The projects prove both sides.",
      },
      {
        title: "Proof, person, pitch",
        body: "Work and samples first, then about me, then services and process right before contact.",
      },
      {
        title: "Wireframes in code",
        body: "Grey placeholder boxes instead of a design tool, one section per commit, so changing the structure stayed cheap.",
      },
    ],
    next: "Real content, then launch, then watching where people get in touch from.",
  },
];
