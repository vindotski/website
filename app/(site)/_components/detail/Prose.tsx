import styles from "./Prose.module.css";

// Wraps an MDX body: posts, work and play pages
export default function Prose({ children }: { children: React.ReactNode }) {
  return <div className={styles.prose}>{children}</div>;
}
