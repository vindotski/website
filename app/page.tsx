import About from "./_components/About";
import Header from "./_components/Header";
import Hero from "./_components/Hero";
import WhatIDo from "./_components/WhatIDo";
import Work from "./_components/Work";

export default function Home() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Work />
        <WhatIDo />
        <About />
      </main>
    </>
  );
}
