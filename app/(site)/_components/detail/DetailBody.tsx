import styles from "./DetailBody.module.css";

export function DetailBody({ children }: { children: React.ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

type DetailBlockProps = {
  id?: string;
  title: string;
  children: React.ReactNode;
};

export function DetailBlock({ id, title, children }: DetailBlockProps) {
  return (
    <section id={id} className={styles.block}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
