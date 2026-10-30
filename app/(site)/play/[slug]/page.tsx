import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNextSample, getSampleBySlug, getSamples } from "@/lib/api";
import { DetailBlock, DetailBody } from "../../_components/detail/DetailBody";
import DetailImage from "../../_components/detail/DetailImage";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import Facts from "../../_components/detail/Facts";
import NextLink from "../../_components/detail/NextLink";
import styles from "./page.module.css";

// Every page is prebuilt, so a navigation that waits for it is still quick.
// Opts out of instant-navigation checks rather than streaming it behind Suspense
export const instant = false;

export async function generateStaticParams() {
  const samples = await getSamples();
  return samples.map((sample) => ({ slug: sample.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/play/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sample = await getSampleBySlug(slug);
  if (!sample) return {};
  return { title: `${sample.name} · Ivan Vinski`, description: sample.summary };
}

export default async function SamplePage({
  params,
}: PageProps<"/play/[slug]">) {
  const { slug } = await params;
  const sample = await getSampleBySlug(slug);
  if (!sample) notFound();

  const next = await getNextSample(slug);

  return (
    <DetailPage backHref="/#work" backLabel="Work">
      <DetailIntro
        title={sample.name}
        summary={sample.summary}
        links={[
          { href: sample.demoUrl, label: "Live demo" },
          ...(sample.sourceUrl
            ? [{ href: sample.sourceUrl, label: "Source" }]
            : []),
        ]}
      />

      <Facts
        facts={[
          { label: "Type", value: sample.type },
          { label: "Stack", value: sample.stack.join(" · ") },
          { label: "Year", value: sample.year },
          { label: "Status", value: sample.status },
        ]}
      />

      <DetailImage image={sample.image} sizes="(min-width: 1080px) 1048px, 100vw" />

      <DetailBody>
        <DetailBlock title="Why I built it">
          <p>{sample.why}</p>
        </DetailBlock>

        <DetailBlock title="Architecture">
          <p>{sample.architecture}</p>
          <DetailImage image={sample.diagram} sizes="(min-width: 752px) 720px, 100vw" />
        </DetailBlock>

        <DetailBlock title="Key decisions">
          {sample.decisions.map((decision) => (
            <div key={decision.title} className={styles.decision}>
              <h3>{decision.title}</h3>
              <p>{decision.body}</p>
            </div>
          ))}
        </DetailBlock>

        <DetailBlock title="What I'd do next">
          <p>{sample.next}</p>
        </DetailBlock>
      </DetailBody>

      {next && <NextLink href={`/play/${next.slug}`} name={next.name} />}
    </DetailPage>
  );
}
