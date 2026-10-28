import { getSamples } from "@/lib/api";
import {
  ProjectCard,
  ProjectGrid,
  ProjectSummary,
  ProjectTags,
} from "./ProjectCards";
import Section from "./Section";

export default async function Samples() {
  const samples = await getSamples();

  return (
    <Section id="samples" title="Samples">
      <ProjectGrid>
        {samples.map((sample) => (
          <ProjectCard
            key={sample.slug}
            label={{ start: sample.type, end: String(sample.year) }}
            name={sample.name}
            href={`/samples/${sample.slug}`}
            image={sample.image}
          >
            <ProjectSummary>{sample.summary}</ProjectSummary>
            <ProjectTags stack={sample.stack} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
