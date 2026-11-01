import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextProject,
  getProjectBySlug,
  getProjectContent,
  getStaticSlugs,
} from "@/lib/content/api";
import type { Project } from "@/lib/content/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatYears } from "@/lib/format";
import DraftBadge from "@/components/draft-badge";
import DetailImage from "@/components/detail/detail-image";
import DetailIntro from "@/components/detail/detail-intro";
import DetailPage from "@/components/layouts/detail-page";
import Facts from "@/components/detail/facts";
import NextLink from "@/components/detail/next-link";
import Prose from "@/components/layouts/prose";
import Body from "@/components/detail/body";

// Every page is prebuilt, so a navigation that waits for it is still quick.
// Opts out of instant-navigation checks rather than streaming it behind Suspense
export const instant = false;

export async function generateStaticParams() {
  return getStaticSlugs("projects");
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getProjectBySlug(slug);
  if (!item) return {};
  return { title: item.title, description: item.tldr };
}

// Jobs link to the product; side projects to a demo and, if open, the source
function links(item: Project) {
  if (item.category === "work") {
    return item.productUrl
      ? [{ href: item.productUrl, label: "Visit product", kind: "product" }]
      : [];
  }
  return [
    { href: item.demoUrl, label: "Live demo", kind: "demo" },
    ...(item.repoUrl ? [{ href: item.repoUrl, label: "Source", kind: "source" }] : []),
  ];
}

function facts(item: Project) {
  if (item.category === "work") {
    return [
      { label: "Role", value: item.role },
      { label: "Company", value: item.company },
      { label: "Years", value: formatYears(item.years) },
      { label: "Stack", value: item.stack.join(" · ") },
    ];
  }
  return [
    { label: "Type", value: item.kind },
    { label: "Stack", value: item.stack.join(" · ") },
    { label: "Year", value: item.year },
    { label: "Status", value: item.status },
  ];
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const item = await getProjectBySlug(slug);
  if (!item) notFound();

  const body = await getProjectContent(slug);
  const next = await getNextProject(slug);

  return (
    <DetailPage backHref="/#projects" backLabel="Projects">
      <DetailIntro title={item.title} summary={item.summary} links={links(item)}>
        <DraftBadge item={item} />
      </DetailIntro>

      <Facts facts={facts(item)} />

      <DetailImage
        image={item.image}
        sizes="(min-width: 1080px) 1048px, 100vw"
        eager
      />

      {/* A note, not an alert: nothing to announce when the page loads */}
      {item.category === "work" && (
        <Alert role="note" aria-label="Impact" className="max-w-[720px]">
          <AlertTitle>Impact</AlertTitle>
          <AlertDescription className="text-base text-foreground">
            {item.impact}
          </AlertDescription>
        </Alert>
      )}

      <Prose>
        <Body body={body} />
      </Prose>

      {next && <NextLink href={`/projects/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
