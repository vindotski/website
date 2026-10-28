import { getWork } from "@/lib/api";
import { formatYears } from "@/lib/format";
import Placeholder from "./Placeholder";
import {
  ProjectCard,
  ProjectGrid,
  ProjectMeta,
  ProjectSummary,
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
            name={item.name}
            href={`/work/${item.slug}`}
            image={<Placeholder label={item.image.alt} height={180} />}
          >
            <ProjectMeta>
              {item.company} · {item.role} · {formatYears(item.years)}
            </ProjectMeta>
            <ProjectSummary>{item.summary}</ProjectSummary>
            <ProjectMeta>{item.stack.join(" · ")}</ProjectMeta>
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
