import type { z } from "zod";
import type { Item } from "./content/load";
import type { projectKind } from "./content/schemas";

export type Hero = {
  // Shown above the headline
  title: string;
  // Shown in the header while the hero or footer is in view
  availability: string;
  headline: string;
};

export type About = {
  intro: string;
};

export type Contact = {
  email: string;
  // One line shown above the contact actions
  prompt: string;
  // Booking page for a call
  callUrl: string;
};

export type SocialName = "GitHub" | "LinkedIn" | "Figma";

export type Social = {
  name: SocialName;
  href: string;
};

export type Image = {
  src: string;
  alt: string;
};

export type YearRange = {
  start: number;
  // Omitted while ongoing ("2021–present")
  end?: number;
};

// One line of the experience timeline
export type Role = {
  title: string;
  company: string;
  years: YearRange;
};

// The three kinds of work, shared by work items, samples and services
export type ProjectType = z.infer<typeof projectKind>;

// A work item's front matter, slug and ## sections
export type Work = Item<"work">;

export type SampleStatus = "Live" | "In progress" | "Archived";

export type ServiceName = ProjectType;

// Points at a work item or sample by slug, resolved to a link by the api
export type ProofLink = { kind: "work" | "samples"; slug: string };

export type Service = {
  name: ServiceName;
  headline: string;
  line: string;
  proof: ProofLink[];
};

export type ResolvedService = Omit<Service, "proof"> & {
  proof: { name: string; href: string }[];
};

export type Decision = {
  title: string;
  body: string;
};

export type Sample = {
  slug: string;
  name: string;
  summary: string;
  type: ProjectType;
  stack: string[];
  year: number;
  status: SampleStatus;
  demoUrl: string;
  sourceUrl?: string;
  image: Image;
  why: string;
  architecture: string;
  diagram: Image;
  decisions: Decision[];
  next: string;
};

// A post's front matter, slug and ## sections
export type Post = Item<"posts">;
