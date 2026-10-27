import styles from "./ProjectCards.module.css";

export function ProjectGrid({ children }: { children: React.ReactNode }) {
  return <ul className={styles.grid}>{children}</ul>;
}

type ProjectCardProps = {
  name: string;
  image: React.ReactNode;
  children: React.ReactNode;
};

export function ProjectCard({ name, image, children }: ProjectCardProps) {
  return (
    <li className={styles.card}>
      {image}
      <h3 className={styles.name}>{name}</h3>
      {children}
    </li>
  );
}
