import { Suspense } from "react";
import FloatingContact from "./_components/FloatingContact";
import Footer from "./_components/Footer";
import Header from "./_components/Header";
import styles from "./layout.module.css";

// The portfolio's chrome. Coming soon and login sit outside this group and
// render without it
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className={styles.content}>{children}</main>
      <Footer />
      {/* Reads the URL, which waits on pages with dynamic params */}
      <Suspense fallback={null}>
        <FloatingContact />
      </Suspense>
    </>
  );
}
