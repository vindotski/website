import About from "./_components/About";
import Contact from "./_components/Contact";
import Footer from "./_components/Footer";
import Hero from "./_components/Hero";
import Samples from "./_components/Samples";
import WhatIDo from "./_components/WhatIDo";
import Work from "./_components/Work";

export default function Home() {
  return (
    <>
      <main id="top">
        <Hero />
        <Work />
        <WhatIDo />
        <Samples />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
