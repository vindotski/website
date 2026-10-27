import Placeholder from "./Placeholder";
import { ProjectCard, ProjectGrid } from "./ProjectCards";
import Section from "./Section";

const samples = ["Dashboard", "Sokobanko", "Openfives"];

export default function Samples() {
  return (
    <Section id="samples" title="Samples">
      <ProjectGrid>
        {samples.map((sample) => (
          <ProjectCard
            key={sample}
            name={sample}
            image={<Placeholder label="Image" height={180} />}
          >
            <Placeholder label="Type · stack" height={24} />
            <Placeholder label="Summary" height={72} />
            <Placeholder label="Live demo · Source" height={24} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
