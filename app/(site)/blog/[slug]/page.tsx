import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextPost,
  getPostBySlug,
  getPostContent,
  getPosts,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import Tags from "../../_components/Tags";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import ScrollLink from "../../_components/ScrollLink";
import NextLink from "../../_components/detail/NextLink";
import styles from "./page.module.css";

// Every post follows the experiment report structure
// Ids match what rehype-slug generates from each post's ## headings
const sections = [
  { id: "the-question", title: "The question" },
  { id: "setup", title: "Setup" },
  { id: "what-i-tried", title: "What I tried" },
  { id: "results", title: "Results" },
  { id: "takeaways", title: "Takeaways" },
];

// Every page is prebuilt, so a navigation that waits for it is still quick.
// Opts out of instant-navigation checks rather than streaming it behind Suspense
export const instant = false;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return { title: `${post.title} · Ivan Vinski`, description: post.tldr };
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const Content = await getPostContent(slug);
  const next = await getNextPost(slug);

  return (
    <DetailPage backHref="/#blog" backLabel="Blog">
      <DetailIntro
        title={post.title}
        links={[
          ...(post.repoUrl ? [{ href: post.repoUrl, label: "Repo" }] : []),
          ...(post.demoUrl ? [{ href: post.demoUrl, label: "Demo" }] : []),
        ]}
      >
        <div className={styles.meta}>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <Tags tags={post.tags} />
        </div>
      </DetailIntro>

      <aside className={styles.tldr} aria-label="Summary">
        <p className={styles.tldrLabel}>TL;DR</p>
        <p className={styles.tldrText}>{post.tldr}</p>
      </aside>

      <nav className={styles.toc} aria-label="Contents">
        <p className={styles.tocLabel}>Contents</p>
        <ol>
          {sections.map((section) => (
            <li key={section.id}>
              <ScrollLink href={`#${section.id}`}>{section.title}</ScrollLink>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.prose}>
        <Content />
      </div>

      {next && <NextLink href={`/blog/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
