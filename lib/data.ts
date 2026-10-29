import type {
  About,
  Contact,
  Hero,
  Role,
  Sample,
  Service,
  Social,
  Work,
} from "./types";

// Fields marked TODO are generated placeholders, to be replaced with real content

export const hero: Hero = {
  availability: "Available for frontend and product work",
  headline: "I build the part you see. And the parts you don't.",
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
  prompt: "Have a role or a product in mind? Let's talk.",
};

// Order: code first (proof behind the samples), then roles and contact, then design
export const socials: Social[] = [
  { name: "GitHub", href: "https://github.com/vindotski" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/vindotski" },
  { name: "Figma", href: "https://www.figma.com/@vindotski" },
];

export const services: Service[] = [
  {
    name: "Product",
    headline: "From idea to MVP.",
    line: "Scope, trade-offs, shipping and measuring, the way the Process below works.",
    proof: [
      { kind: "work", slug: "kalistenio" },
      { kind: "samples", slug: "vinui" },
    ],
  },
  {
    name: "Fullstack",
    headline: "From the screen to the database.",
    line: "UI, API and data, built as one piece.",
    proof: [
      { kind: "work", slug: "odjeca-hr" },
      { kind: "samples", slug: "sokobanko" },
    ],
  },
  {
    name: "Frontend",
    headline: "Interfaces that keep up.",
    line: "Real-time, data-heavy UIs with complex state, fast and built to last.",
    proof: [
      { kind: "work", slug: "huddleos" },
      { kind: "samples", slug: "spotcraft" },
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
    type: "Frontend",
    years: { start: 2020, end: 2024 },
    stack: ["Vue", "GraphQL", "WebSockets"],
    productUrl: "https://huddle.tech/products/huddle-os/",
    image: { src: "/images/work/huddleos.svg", alt: "HuddleOS dashboard" }, // TODO
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
    slug: "kalistenio",
    name: "Kalistenio",
    summary: "Calisthenics training, in your pocket.", // TODO
    company: "Independent",
    role: "Product Engineer", // TODO
    type: "Product",
    years: { start: 2025 }, // TODO
    stack: ["React Native", "Supabase"],
    image: { src: "/images/work/kalistenio.svg", alt: "Kalistenio workout screen" }, // TODO
    impact: "From idea to app store, on my own.", // TODO
    // TODO
    context:
      "Kalistenio is a calisthenics app for people training with their own body weight. It plans workouts and tracks progress over time.",
    // TODO
    myRole:
      "Everything: product decisions, design, the React Native app and the Supabase backend.",
  },
  {
    slug: "vindotski",
    name: "Vindotski",
    summary: "This site, built as a product.",
    company: "Independent",
    role: "Product Engineer", // TODO
    type: "Frontend", // TODO
    years: { start: 2026 },
    stack: ["Next.js", "React", "TypeScript"],
    // TODO: productUrl once the domain is set
    image: { src: "/images/work/vindotski.svg", alt: "Portfolio home page" }, // TODO
    impact: "Two audiences. One story.", // TODO
    context:
      "Two audiences need different things from me. Employers hiring full time look for a frontend engineer. Freelance clients look for someone who can build a whole product.",
    // TODO
    myRole:
      "Everything: positioning, structure, copy and code. Next.js 16 with the App Router and Cache Components, so pages are built ahead of time, styled with CSS Modules.",
  },
  {
    slug: "odjeca-hr",
    name: "Odjeca.hr",
    summary: "Fashion search for a whole region.",
    company: "Interproactive",
    role: "Software Engineer",
    type: "Fullstack",
    years: { start: 2024, end: 2025 },
    stack: ["Node.js", "React", "Handlebars", "MongoDB"],
    productUrl: "https://odjeca.hr/zene",
    image: { src: "/images/work/odjeca-hr.svg", alt: "Odjeca.hr search results" }, // TODO
    impact: "Thousands of shops. One search.", // TODO
    // TODO
    context:
      "Odjeca.hr is a large vertical search engine for fashion across Croatia and the Balkans. It brings products from many shops into one place to search and compare.",
    // TODO
    myRole:
      "I worked across the stack: search pages in React and Handlebars, and the Node.js and MongoDB services behind them.",
  },
];

export const samples: Sample[] = [
  {
    slug: "vinui",
    name: "VinUI",
    summary: "One component API, cross-framework and cross-platform.",
    type: "Product",
    stack: ["React", "Vue", "React Native"],
    year: 2026, // TODO
    status: "Live", // TODO
    demoUrl: "https://vinui.dev",
    image: { src: "/images/samples/vinui.svg", alt: "One button rendered in React, Vue and React Native" }, // TODO
    // TODO
    why: "To write a component once and use it in React, Vue and React Native, instead of keeping three libraries in step.",
    // TODO
    architecture:
      "One component API, with a thin layer per framework that maps it onto React, Vue and React Native.",
    diagram: { src: "/images/samples/vinui-diagram.svg", alt: "VinUI architecture" }, // TODO
    // TODO
    decisions: [
      {
        title: "One API for every framework",
        body: "The same props and names everywhere, so moving between React, Vue and Native costs nothing.",
      },
    ],
    // TODO
    next: "More components, and docs for each framework.",
  },
  {
    slug: "sokobanko",
    name: "Sokobanko",
    summary: "A classic puzzle game, rebuilt from scratch.",
    type: "Product",
    stack: ["TypeScript", "Vue", "Nuxt", "Pixi", "Supabase"],
    year: 2026, // TODO
    status: "Live",
    demoUrl: "https://example.com/sokoban", // TODO
    sourceUrl: "https://github.com/example/sokoban", // TODO
    image: { src: "/images/samples/sokobanko.svg", alt: "Sokobanko level in play" }, // TODO
    // TODO
    why: "To build a complete game end to end: rendering, game logic, and a backend for players and progress.",
    // TODO
    architecture:
      "A Nuxt app renders the game with Pixi. Game logic is plain TypeScript, separate from rendering. Supabase stores players and their progress.",
    diagram: { src: "/images/samples/sokobanko-diagram.svg", alt: "Sokobanko architecture" }, // TODO
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
    slug: "spotcraft",
    name: "Spotcraft",
    summary: "A data dashboard that stays fast.", // TODO
    type: "Product",
    stack: ["React", "TanStack"],
    year: 2026, // TODO
    status: "Live",
    demoUrl: "https://example.com/dashboard", // TODO
    sourceUrl: "https://github.com/example/dashboard", // TODO
    image: { src: "/images/samples/spotcraft.svg", alt: "Spotcraft overview" }, // TODO
    // TODO
    why: "To see how far TanStack's query, table and router libraries go together on a data-heavy screen.",
    // TODO
    architecture:
      "A React app with TanStack Router for routing, TanStack Query for server state and TanStack Table for the data grids.",
    diagram: { src: "/images/samples/spotcraft-diagram.svg", alt: "Spotcraft architecture" }, // TODO
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
    slug: "openfives",
    name: "Openfives",
    summary: "Five by five strength training, open source.", // TODO
    type: "Product",
    stack: ["React Native"],
    year: 2026, // TODO
    status: "In progress", // TODO
    demoUrl: "https://example.com/openfives", // TODO
    image: { src: "/images/samples/openfives.svg", alt: "Openfives workout screen" }, // TODO
    // TODO
    why: "A StrongLifts-style 5×5 tracker of my own: a simple workout plan, logged set by set, with the weights going up over time.",
    // TODO
    architecture:
      "A React Native app. Workout logic, the sets, reps and next weights, sits apart from the screens, and progress is saved after every set.",
    diagram: { src: "/images/samples/openfives-diagram.svg", alt: "Openfives architecture" }, // TODO
    // TODO
    decisions: [
      {
        title: "Logic apart from the screens",
        body: "The rules for sets and weight increases run without the UI, so they're easy to test.",
      },
    ],
    // TODO
    next: "Charts for progress over time, and more programs than 5×5.",
  },
];
