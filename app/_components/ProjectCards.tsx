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
  children: React.ReactNode;
};

export function ProjectSummary({ children }: { children: React.ReactNode }) {
  return <p className={styles.summary}>{children}</p>;
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
  children,
}: ProjectCardProps) {
  return (
    <li className={styles.card}>
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
          sizes="(min-width: 1080px) 344px, (min-width: 640px) 50vw, 100vw"
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
