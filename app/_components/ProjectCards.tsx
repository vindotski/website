import Image from "next/image";
import Link from "next/link";
import { toTag } from "@/lib/format";
import type { Image as ContentImage } from "@/lib/types";
import Tags from "./Tags";
import styles from "./ProjectCards.module.css";

export function ProjectGrid({ children }: { children: React.ReactNode }) {
  return <ul className={styles.grid}>{children}</ul>;
}

type ProjectCardProps = {
  // Shown above the image: kind of work and years
  label: { start: string; end: string };
  // Optional line above the name, e.g. the company
  eyebrow?: string;
  name: string;
  href: string;
  image: ContentImage;
  // Takes a whole row, image beside the text on wider screens
  featured?: boolean;
  children: React.ReactNode;
};

export function ProjectSummary({ children }: { children: React.ReactNode }) {
  return <p className={styles.summary}>{children}</p>;
}

// A result worth calling out, for the featured card
export function ProjectImpact({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.impact}>
      <p className={styles.impactLabel}>Impact</p>
      <p className={styles.impactText}>{children}</p>
    </div>
  );
}

// The stack as #tags, matching the blog list
export function ProjectTags({ stack }: { stack: string[] }) {
  return (
    <p className={styles.tags}>
      <Tags tags={stack.map(toTag)} />
    </p>
  );
}

export function ProjectCard({
  label,
  eyebrow,
  name,
  href,
  image,
  featured = false,
  children,
}: ProjectCardProps) {
  return (
    <li className={featured ? `${styles.card} ${styles.featured}` : styles.card}>
      <p className={styles.label}>
        <span>{label.start}</span>
        <span>{label.end}</span>
      </p>
      {/* Fixed 16:10 frame, so cards line up whatever size the real images are */}
      <div className={styles.image}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={
            featured
              ? "(min-width: 1080px) 620px, (min-width: 768px) 60vw, 100vw"
              : "(min-width: 1080px) 344px, (min-width: 640px) 50vw, 100vw"
          }
        />
      </div>
      <div className={styles.content}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h3 className={styles.name}>
          {/* Stretched over the whole card so the card is one click target */}
          <Link href={href} className={styles.link}>
            {name}
          </Link>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </h3>
        {children}
      </div>
    </li>
  );
}
