import styles from "./Section.module.css";

type SectionProps = {
  id: string;
  title: string;
  centerTitle?: boolean;
  children: React.ReactNode;
};

export default function Section({
  id,
  title,
  centerTitle = false,
  children,
}: SectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className={centerTitle ? `${styles.title} ${styles.centered}` : styles.title}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
