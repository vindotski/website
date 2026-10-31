import Blog from "./_components/Blog";
import Experience from "@/features/profile/components/experience";
import Hero from "@/features/profile/components/hero";
import Process from "@/features/profile/components/process";
import ScrollOnArrival from "@/components/scroll-on-arrival";
import Services from "@/features/profile/components/services";
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
