import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextPlay,
  getPlay,
  getPlayBySlug,
  getPlayContent,
} from "@/lib/api";
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
  const play = await getPlay();
  return play.map((item) => ({ slug: item.slug }));
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
          { href: item.demoUrl, label: "Live demo" },
          ...(item.repoUrl ? [{ href: item.repoUrl, label: "Source" }] : []),
        ]}
      />

      <Facts
        facts={[
          { label: "Type", value: item.kind },
          { label: "Stack", value: item.stack.join(" · ") },
          { label: "Year", value: item.year },
          { label: "Status", value: item.status },
        ]}
      />

      <DetailImage image={item.image} sizes="(min-width: 1080px) 1048px, 100vw" />

      <Prose>
        <Content />
      </Prose>

      {next && <NextLink href={`/play/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
