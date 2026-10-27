import Placeholder from "./Placeholder";
import { ProjectCard, ProjectGrid } from "./ProjectCards";
import Section from "./Section";

const projects = ["HuddleOS", "Odjeca.hr", "Kalistenio"];

export default function Work() {
  return (
    <Section id="work" title="Work">
      <ProjectGrid>
        {projects.map((project) => (
          <ProjectCard
            key={project}
            name={project}
            href="/work/template"
            image={<Placeholder label="Image" height={180} />}
          >
            <Placeholder label="Company · role · years" height={24} />
            <Placeholder label="Summary" height={72} />
            <Placeholder label="Stack" height={24} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
