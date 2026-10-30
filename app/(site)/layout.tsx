import { Suspense } from "react";
import FloatingContact from "./_components/FloatingContact";
import Footer from "./_components/Footer";
import Header from "./_components/Header";

// The portfolio's chrome. Coming soon and login sit outside this group and
// render without it
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      {/* Fills the space between header and footer, so the footer stays at
          the bottom */}
      <main className="flex-1">{children}</main>
      <Footer />
      {/* Reads the URL, which waits on pages with dynamic params */}
      <Suspense fallback={null}>
        <FloatingContact />
      </Suspense>
    </>
  );
}
