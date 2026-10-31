import Link from "next/link";
import { getPosts } from "@/lib/api";
import { formatDate } from "@/lib/format";
import DraftBadge from "@/components/draft-badge";
import Section from "@/components/layouts/section";
import Tags from "@/components/tags";

export default async function Blog() {
  const posts = await getPosts();

  return (
    <Section id="blog" title="Blog">
      <ul className="divide-y border-y">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex items-center gap-4 py-5 pr-2"
            >
              <div className="flex flex-1 flex-col gap-2">
                <h3 className="max-w-[560px] text-xl font-semibold tracking-tight underline-offset-4 group-hover:underline group-focus-visible:underline">
                  {post.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {post.date && (
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  )}
                  <Tags tags={post.tags} />
                  <DraftBadge item={post} />
                </div>
              </div>
              <span
                className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground group-focus-visible:translate-x-1 group-focus-visible:text-foreground"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
