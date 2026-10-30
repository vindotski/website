import ScrollLink from "../ScrollLink";
import styles from "./DetailPage.module.css";

type DetailPageProps = {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
};

export default function DetailPage({
  backHref,
  backLabel,
  children,
}: DetailPageProps) {
  return (
    <article className={styles.page}>
      <ScrollLink href={backHref} className={styles.back}>
        ← {backLabel}
      </ScrollLink>
      {children}
    </article>
  );
}
