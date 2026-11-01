import Footer from "./_components/footer";
import Header from "./_components/header";

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
    </>
  );
}
