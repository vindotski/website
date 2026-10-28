import styles from "./DetailIntro.module.css";

type ExternalLink = { href: string; label: string };

type DetailIntroProps = {
  title: string;
  summary?: string;
  links?: ExternalLink[];
  children?: React.ReactNode;
};

export default function DetailIntro({
  title,
  summary,
  links = [],
  children,
}: DetailIntroProps) {
  return (
    <header className={styles.intro}>
      <h1 className={styles.title}>{title}</h1>
      {summary && <p className={styles.summary}>{summary}</p>}
      {children}
      {links.length > 0 && (
        <p className={styles.links}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label} ↗
            </a>
          ))}
        </p>
      )}
    </header>
  );
}
