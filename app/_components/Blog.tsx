import Link from "next/link";
import { getPosts } from "@/lib/api";
import { formatDate } from "@/lib/format";
import Section from "./Section";
import Tags from "./Tags";
import styles from "./Blog.module.css";

export default async function Blog() {
  const posts = await getPosts();

  return (
    <Section id="blog" title="Blog">
      <ul className={styles.posts}>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href="/blog/template" className={styles.post}>
              <div className={styles.text}>
                <h3 className={styles.title}>{post.title}</h3>
                <div className={styles.meta}>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <Tags tags={post.tags} />
                </div>
              </div>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
