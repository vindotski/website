import { getProjects } from "@/lib/content/api";
import { formatYears } from "@/lib/format";
import {
  ProjectCard,
  ProjectGrid,
  ProjectImpact,
  ProjectSummary,
  ProjectTags,
} from "./project-cards";
import DraftBadge from "@/components/draft-badge";
import Section from "@/components/layouts/section";

// Jobs first, then side projects, in front matter order
export default async function ProjectsSection() {
  const projects = await getProjects();

  return (
    <Section id="projects" title="Projects">
      <ProjectGrid columns={2}>
        {/* The first item gets a row of its own */}
        {projects.map((item, index) => (
          <ProjectCard
            key={item.slug}
            label={{
              start: item.kind,
              end: item.category === "work" ? formatYears(item.years) : String(item.year),
            }}
            eyebrow={item.category === "work" ? item.company : undefined}
            name={item.title}
            href={`/projects/${item.slug}`}
            image={item.image}
            featured={index === 0}
            wide
          >
            <ProjectSummary>{item.summary}</ProjectSummary>
            {index === 0 && item.category === "work" && (
              <ProjectImpact>{item.impact}</ProjectImpact>
            )}
            <ProjectTags stack={item.stack} />
            <DraftBadge item={item} />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </Section>
  );
}
