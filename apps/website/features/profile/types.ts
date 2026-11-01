import type { ContentType } from "@/config/content-types";
import type { ProjectType } from "@/lib/content/types";
import type { SocialName, YearRange } from "@/types/common";

export type Hero = {
  // Shown above the headline
  title: string;
  // Shown under the hero headline
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

export type Social = {
  name: SocialName;
  href: string;
};

// One line of the experience timeline
export type Role = {
  title: string;
  company: string;
  years: YearRange;
};

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
