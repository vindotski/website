import { getWork } from "@/lib/api";
import { formatYears } from "@/lib/format";
import {
  ProjectCard,
  ProjectGrid,
  ProjectImpact,
  ProjectSummary,
  ProjectTags,
} from "./ProjectCards";
import Section from "./Section";

export default async function Work() {
  const work = await getWork();

  return (
    <Section id="work" title="Work">
      <ProjectGrid>
        {/* The first item gets a row of its own */}
        {work.map((item, index) => (
          <ProjectCard
            key={item.slug}
            label={{ start: item.type, end: formatYears(item.years) }}
            eyebrow={item.company}
            name={item.name}
            href={`/work/${item.slug}`}
            image={item.image}
            featured={index === 0}
          >
            <ProjectSummary>{item.summary}</ProjectSummary>
            {index === 0 && <ProjectImpact>{item.impact}</ProjectImpact>}
            <ProjectTags stack={item.stack} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
