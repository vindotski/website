import About from "./_components/About";
import Blog from "./_components/Blog";
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
      <Samples />
      <Blog />
      <About />
      <Services />
      <Process />
      <Contact />
    </>
  );
}
