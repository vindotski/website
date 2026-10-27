import Placeholder from "./Placeholder";
import Section from "./Section";
import styles from "./Blog.module.css";

const posts = ["Post 1", "Post 2", "Post 3"];

export default function Blog() {
  return (
    <Section id="blog" title="Blog">
      <ul className={styles.posts}>
        {posts.map((post) => (
          <li key={post} className={styles.post}>
            <Placeholder label={`${post} · title`} height={28} />
            <div className={styles.meta}>
              <time>Date</time>
              <span className={styles.tags}>#tag #tag</span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
