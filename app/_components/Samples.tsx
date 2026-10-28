import { getSamples } from "@/lib/api";
import Placeholder from "./Placeholder";
import {
  ProjectCard,
  ProjectGrid,
  ProjectLinks,
  ProjectMeta,
  ProjectSummary,
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
            name={sample.name}
            href={`/samples/${sample.slug}`}
            image={<Placeholder label={sample.image.alt} height={180} />}
          >
            <ProjectMeta>
              {[sample.type, ...sample.stack].join(" · ")}
            </ProjectMeta>
            <ProjectSummary>{sample.summary}</ProjectSummary>
            <ProjectLinks
              links={[
                { href: sample.demoUrl, label: "Demo" },
                ...(sample.sourceUrl
                  ? [{ href: sample.sourceUrl, label: "Source" }]
                  : []),
              ]}
            />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
