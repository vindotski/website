import { getPlay, getWork } from "@/lib/api";
import { formatYears } from "@/lib/format";
import {
  ProjectCard,
  ProjectGrid,
  ProjectImpact,
  ProjectSummary,
  ProjectTags,
} from "./ProjectCards";
import DraftBadge from "./DraftBadge";
import Section from "./Section";

// Jobs first, then side projects (Play) as plain cards after them
export default async function Work() {
  const [work, play] = await Promise.all([getWork(), getPlay()]);

  return (
    <Section id="work" title="Work">
      <ProjectGrid columns={2}>
        {/* The first item gets a row of its own */}
        {work.map((item, index) => (
          <ProjectCard
            key={item.slug}
            label={{ start: item.kind, end: formatYears(item.years) }}
            eyebrow={item.company}
            name={item.title}
            href={`/work/${item.slug}`}
            image={item.image}
            featured={index === 0}
            wide
          >
            <ProjectSummary>{item.summary}</ProjectSummary>
            {index === 0 && <ProjectImpact>{item.impact}</ProjectImpact>}
            <ProjectTags stack={item.stack} />
            <DraftBadge item={item} />
          </ProjectCard>
        ))}
        {play.map((item) => (
          <ProjectCard
            key={item.slug}
            label={{ start: item.kind, end: String(item.year) }}
            name={item.title}
            href={`/play/${item.slug}`}
            image={item.image}
            wide
          >
            <ProjectSummary>{item.summary}</ProjectSummary>
            <ProjectTags stack={item.stack} />
            <DraftBadge item={item} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
