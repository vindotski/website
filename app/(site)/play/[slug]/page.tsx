import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextPlay,
  getPlayBySlug,
  getPlayContent,
  getStaticSlugs,
} from "@/lib/api";
import DraftBadge from "@/components/draft-badge";
import DetailImage from "@/components/detail/detail-image";
import DetailIntro from "@/components/detail/detail-intro";
import DetailPage from "@/components/layouts/detail-page";
import Facts from "@/components/detail/facts";
import NextLink from "@/components/detail/next-link";
import Prose from "@/components/layouts/prose";

// Every page is prebuilt, so a navigation that waits for it is still quick.
// Opts out of instant-navigation checks rather than streaming it behind Suspense
export const instant = false;

export async function generateStaticParams() {
  return getStaticSlugs("play");
}

export async function generateMetadata({
  params,
}: PageProps<"/play/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPlayBySlug(slug);
  if (!item) return {};
  return { title: item.title, description: item.tldr };
}

export default async function PlayPage({ params }: PageProps<"/play/[slug]">) {
  const { slug } = await params;
  const item = await getPlayBySlug(slug);
  if (!item) notFound();

  const Content = await getPlayContent(slug);
  const next = await getNextPlay(slug);

  return (
    <DetailPage backHref="/#work" backLabel="Work">
      <DetailIntro
        title={item.title}
        summary={item.summary}
        links={[
          { href: item.demoUrl, label: "Live demo", kind: "demo" },
          ...(item.repoUrl ? [{ href: item.repoUrl, label: "Source", kind: "source" }] : []),
        ]}
      >
        <DraftBadge item={item} />
      </DetailIntro>

      <Facts
        facts={[
          { label: "Type", value: item.kind },
          { label: "Stack", value: item.stack.join(" · ") },
          { label: "Year", value: item.year },
          { label: "Status", value: item.status },
        ]}
      />

      <DetailImage
        image={item.image}
        sizes="(min-width: 1080px) 1048px, 100vw"
        eager
      />

      <Prose>
        <Content />
      </Prose>

      {next && <NextLink href={`/play/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
