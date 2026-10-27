import styles from "./DetailIntro.module.css";

type DetailIntroProps = {
  title: string;
  children: React.ReactNode;
};

export default function DetailIntro({ title, children }: DetailIntroProps) {
  return (
    <header className={styles.intro}>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </header>
  );
}
