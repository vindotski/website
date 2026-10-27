import Link from "next/link";
import Placeholder from "./Placeholder";
import Section from "./Section";
import styles from "./Blog.module.css";

const posts = ["Post 1", "Post 2", "Post 3"];

export default function Blog() {
  return (
    <Section id="blog" title="Blog">
      <ul className={styles.posts}>
        {posts.map((post) => (
          <li key={post}>
            <Link href="/blog/template" className={styles.post}>
              <div className={styles.text}>
                <Placeholder label={`${post} · title`} height={28} />
                <div className={styles.meta}>
                  <time>Date</time>
                  <span className={styles.tags}>#tag #tag</span>
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
