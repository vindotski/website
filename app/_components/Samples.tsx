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
    <Section id="play" title="Play">
      <ProjectGrid>
        {/* The first item gets a row of its own */}
        {samples.map((sample, index) => (
          <ProjectCard
            key={sample.slug}
            label={{ start: sample.type, end: String(sample.year) }}
            name={sample.name}
            href={`/play/${sample.slug}`}
            image={sample.image}
            featured={index === 0}
          >
            <ProjectSummary>{sample.summary}</ProjectSummary>
            <ProjectTags stack={sample.stack} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
