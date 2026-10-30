import styles from "./layout.module.css";

// Auth pages render bare: one narrow column in the middle of the screen
export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <main className={styles.auth}>
      <div className={styles.column}>{children}</div>
    </main>
  );
}
