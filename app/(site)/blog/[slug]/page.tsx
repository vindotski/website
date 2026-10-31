import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getNextPost,
  getPostBySlug,
  getPostContent,
  getStaticSlugs,
} from "@/lib/content/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TableOfContents from "@/features/blog/components/table-of-contents";
import { formatDate } from "@/lib/format";
import { trackViewAttributes } from "@/lib/analytics/track";
import DraftBadge from "@/components/draft-badge";
import Tags from "@/components/tags";
import DetailIntro from "@/components/detail/detail-intro";
import DetailPage from "@/components/layouts/detail-page";
import NextLink from "@/components/detail/next-link";
import Prose from "@/components/layouts/prose";

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

      <TableOfContents sections={post.sections} />

      <Prose>
        <Content />
      </Prose>
      {/* Seen once someone reaches the end of the post */}
      <div
        aria-hidden="true"
        {...trackViewAttributes({ event: "post_read", slug: post.slug })}
      />

      {next && <NextLink href={`/blog/${next.slug}`} name={next.title} />}
    </DetailPage>
  );
}
