import type { z } from "zod";
import type { ContentType } from "./content-types";
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

// The three kinds of work, shared by work items, play items and services
export type ProjectType = z.infer<typeof projectKind>;

// A work item's front matter, slug and ## sections
export type Work = Item<"work">;

export type ServiceName = ProjectType;

// Points at an item of any content type by slug, resolved to a link by the api
export type ProofLink = { type: ContentType; slug: string };

export type Service = {
  name: ServiceName;
  headline: string;
  line: string;
  proof: ProofLink[];
};

export type ResolvedService = Omit<Service, "proof"> & {
  proof: { name: string; href: string }[];
};

// A play item's front matter, slug and ## sections
export type Play = Item<"play">;

// A post's front matter, slug and ## sections
export type Post = Item<"posts">;
