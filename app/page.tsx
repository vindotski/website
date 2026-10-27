import Header from "./_components/Header";
import Hero from "./_components/Hero";
import Work from "./_components/Work";

export default function Home() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Work />
      </main>
    </>
  );
}
