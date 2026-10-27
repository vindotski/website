import About from "./_components/About";
import Contact from "./_components/Contact";
import Hero from "./_components/Hero";
import Process from "./_components/Process";
import Samples from "./_components/Samples";
import Services from "./_components/Services";
import Work from "./_components/Work";

export default function Home() {
  return (
    <>
      <Hero />
      <Work />
      <Services />
      <Samples />
      <Process />
      <About />
      <Contact />
    </>
  );
}
