import Link from "next/link";
import styles from "./ProjectCards.module.css";

export function ProjectGrid({ children }: { children: React.ReactNode }) {
  return <ul className={styles.grid}>{children}</ul>;
}

type ProjectCardProps = {
  name: string;
  href: string;
  image: React.ReactNode;
  children: React.ReactNode;
};

export function ProjectCard({ name, href, image, children }: ProjectCardProps) {
  return (
    <li className={styles.card}>
      {image}
      <h3 className={styles.name}>
        {/* Stretched over the whole card so the card is one click target */}
        <Link href={href} className={styles.link}>
          {name}
        </Link>
      </h3>
      {children}
    </li>
  );
}
