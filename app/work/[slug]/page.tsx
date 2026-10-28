import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNextWork, getWork, getWorkBySlug } from "@/lib/api";
import { formatYears } from "@/lib/format";
import ContactPrompt from "../../_components/detail/ContactPrompt";
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
  const work = await getWork();
  return work.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getWorkBySlug(slug);
  if (!item) return {};
  return { title: `${item.name} · Ivan Vinski`, description: item.summary };
}

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const item = await getWorkBySlug(slug);
  if (!item) notFound();

  const next = await getNextWork(slug);

  return (
    <DetailPage backHref="/#work" backLabel="Work">
      <DetailIntro
        title={item.name}
        summary={item.summary}
        links={
          item.productUrl
            ? [{ href: item.productUrl, label: "Visit product" }]
            : []
        }
      />

      <Facts
        facts={[
          { label: "Role", value: item.role },
          { label: "Company", value: item.company },
          { label: "Years", value: formatYears(item.years) },
          { label: "Stack", value: item.stack.join(" · ") },
        ]}
      />

      <DetailImage image={item.image} sizes="(min-width: 1080px) 1048px, 100vw" />

      <aside className={styles.impact} aria-label="Impact">
        <p className={styles.impactLabel}>Impact</p>
        <p className={styles.impactText}>{item.impact}</p>
      </aside>

      <DetailBody>
        <DetailBlock title="Context">
          <p>{item.context}</p>
        </DetailBlock>

        <DetailBlock title="My role">
          <p>{item.myRole}</p>
        </DetailBlock>
      </DetailBody>

      {next && <NextLink href={`/work/${next.slug}`} name={next.name} />}

      <ContactPrompt />
    </DetailPage>
  );
}
