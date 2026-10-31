import ScrollOnArrival from "@/components/scroll-on-arrival";
import BlogSection from "@/features/blog/components/blog-section";
import Experience from "@/features/profile/components/experience";
import Hero from "@/features/profile/components/hero";
import Process from "@/features/profile/components/process";
import Services from "@/features/profile/components/services";
import ProjectsSection from "@/features/projects/components/projects-section";

export default function Home() {
  return (
    <>
      <Hero />
      <ProjectsSection />
      <Services />
      <Experience />
      <Process />
      <BlogSection />
      <ScrollOnArrival />
    </>
  );
}
