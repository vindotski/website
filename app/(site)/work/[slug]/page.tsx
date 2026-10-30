import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextWork,
  getStaticSlugs,
  getWorkBySlug,
  getWorkContent,
} from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatYears } from "@/lib/format";
import DraftBadge from "../../_components/DraftBadge";
import DetailImage from "../../_components/detail/DetailImage";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import Facts from "../../_components/detail/Facts";
import NextLink from "../../_components/detail/NextLink";
import Prose from "../../_components/detail/Prose";

// Every page is prebuilt, so a navigation that waits for it is still quick.
// Opts out of instant-navigation checks rather than streaming it behind Suspense
export const instant = false;

export async function generateStaticParams() {
  return getStaticSlugs("work");
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getWorkBySlug(slug);
  if (!item) return {};
  return { title: item.title, description: item.tldr };
}

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const item = await getWorkBySlug(slug);
  if (!item) notFound();

  const Content = await getWorkContent(slug);
  const next = await getNextWork(slug);

  return (
    <DetailPage backHref="/#work" backLabel="Work">
      <DetailIntro
        title={item.title}
        summary={item.summary}
        links={
          item.productUrl
            ? [{ href: item.productUrl, label: "Visit product" }]
            : []
        }
      >
        <DraftBadge item={item} />
      </DetailIntro>

      <Facts
        facts={[
          { label: "Role", value: item.role },
          { label: "Company", value: item.company },
          { label: "Years", value: formatYears(item.years) },
          { label: "Stack", value: item.stack.join(" · ") },
        ]}
      />

      <DetailImage
        image={item.image}
        sizes="(min-width: 1080px) 1048px, 100vw"
        eager
      />

      {/* A note, not an alert: nothing to announce when the page loads */}
      <Alert role="note" aria-label="Impact" className="max-w-[720px]">
        <AlertTitle>Impact</AlertTitle>
        <AlertDescription className="text-base text-foreground">
          {item.impact}
        </AlertDescription>
      </Alert>

      <Prose>
        <Content />
      </Prose>

      {next && <NextLink href={`/work/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
