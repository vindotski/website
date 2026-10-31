import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextPost,
  getPostBySlug,
  getPostContent,
  getStaticSlugs,
} from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";
import DraftBadge from "../../_components/DraftBadge";
import Tags from "../../_components/Tags";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import ScrollLink from "../../_components/ScrollLink";
import NextLink from "../../_components/detail/NextLink";
import Prose from "../../_components/detail/Prose";

// Every page is prebuilt, so a navigation that waits for it is still quick.
// Opts out of instant-navigation checks rather than streaming it behind Suspense
export const instant = false;

export async function generateStaticParams() {
  return getStaticSlugs("posts");
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return { title: post.title, description: post.tldr };
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
          ...(post.repoUrl ? [{ href: post.repoUrl, label: "Repo", kind: "repo" }] : []),
          ...(post.demoUrl ? [{ href: post.demoUrl, label: "Demo", kind: "demo" }] : []),
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {post.date && (
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          )}
          <Tags tags={post.tags} />
          <DraftBadge item={post} />
        </div>
      </DetailIntro>

      {/* A note, not an alert: nothing to announce when the page loads */}
      <Alert role="note" aria-label="Summary" className="max-w-[720px]">
        <AlertTitle>TL;DR</AlertTitle>
        <AlertDescription className="text-base text-foreground">
          {post.tldr}
        </AlertDescription>
      </Alert>

      {/* From the post's ## headings, with the ids rehype-slug gives them */}
      {post.sections.length > 0 && (
        <nav
          className="flex max-w-[720px] flex-col gap-2 text-sm"
          aria-label="Contents"
        >
          <p className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Contents
          </p>
          <ol className="flex flex-col gap-1 pl-5">
            {post.sections.map((section) => (
              <li key={section.id}>
                <ScrollLink
                  href={`#${section.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {section.title}
                </ScrollLink>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <Prose>
        <Content />
      </Prose>

      {next && <NextLink href={`/blog/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
