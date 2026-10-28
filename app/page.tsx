import Blog from "./_components/Blog";
import Contact from "./_components/Contact";
import Experience from "./_components/Experience";
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
      <Experience />
      <Services />
      <Process />
      <Contact />
    </>
  );
}
