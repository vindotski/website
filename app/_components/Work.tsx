import { getWork } from "@/lib/api";
import { formatYears } from "@/lib/format";
import {
  ProjectCard,
  ProjectGrid,
  ProjectSummary,
  ProjectTags,
} from "./ProjectCards";
import Section from "./Section";

export default async function Work() {
  const work = await getWork();

  return (
    <Section id="work" title="Work">
      <ProjectGrid>
        {work.map((item) => (
          <ProjectCard
            key={item.slug}
            label={{ start: item.type, end: formatYears(item.years) }}
            eyebrow={item.company}
            name={item.name}
            href={`/work/${item.slug}`}
            image={item.image}
          >
            <ProjectSummary>{item.summary}</ProjectSummary>
            <ProjectTags stack={item.stack} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
