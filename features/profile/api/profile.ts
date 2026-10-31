import { CONTENT_TYPES } from "@/config/content-types";
import { getItem } from "@/lib/content/api";
import { about, contact, experience, hero, services, socials } from "../data";
import type {
  About,
  Contact,
  Hero,
  ResolvedService,
  Role,
  Social,
} from "../types";

// The profile's copy, from data.ts. Async so callers stay the same if it
// moves out of local data

export async function getHero(): Promise<Hero> {
  return hero;
}

export async function getExperience(): Promise<Role[]> {
  return experience;
}

export async function getAbout(): Promise<About> {
  return about;
}

export async function getContact(): Promise<Contact> {
  return contact;
}

export async function getSocials(): Promise<Social[]> {
  return socials;
}

// Proof slugs become links; any that no longer match a project are dropped,
// so renaming or removing a project can't leave a broken link
export async function getServices(): Promise<ResolvedService[]> {
  return Promise.all(
    services.map(async (service) => {
      const items = await Promise.all(
        service.proof.map(({ type, slug }) => getItem(type, slug)),
      );
      return {
        ...service,
        proof: service.proof.flatMap(({ type, slug }, index) => {
          const item = items[index];
          const href = `${CONTENT_TYPES[type].route}/${slug}`;
          return item ? [{ name: item.title, href }] : [];
        }),
      };
    }),
  );
}
