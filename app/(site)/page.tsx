import Blog from "./_components/Blog";
import Experience from "./_components/Experience";
import Hero from "./_components/Hero";
import Process from "./_components/Process";
import ScrollOnArrival from "./_components/ScrollOnArrival";
import Services from "./_components/Services";
import Work from "./_components/Work";

export default function Home() {
  return (
    <>
      <Hero />
      <Work />
      <Services />
      <Experience />
      <Process />
      <Blog />
      <ScrollOnArrival />
    </>
  );
}
