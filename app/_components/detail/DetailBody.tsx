import styles from "./DetailBody.module.css";

export function DetailBody({ children }: { children: React.ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

type DetailBlockProps = {
  title: string;
  children: React.ReactNode;
};

export function DetailBlock({ title, children }: DetailBlockProps) {
  return (
    <section className={styles.block}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
