import Placeholder from "../../_components/Placeholder";
import Tags from "../../_components/Tags";
import { DetailBlock, DetailBody } from "../../_components/detail/DetailBody";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import styles from "./page.module.css";

export default function BlogTemplate() {
  return (
    <DetailPage backHref="/#blog" backLabel="Blog">
      <DetailIntro title="Post title">
        <div className={styles.meta}>
          <time>Date</time>
          <Tags tags={["tag", "tag", "tag"]} />
        </div>
        <div className={styles.links}>
          <Placeholder label="Repo ↗" height={24} />
          <Placeholder label="Demo ↗" height={24} />
        </div>
      </DetailIntro>

      <aside className={styles.tldr} aria-label="Summary">
        <p className={styles.tldrLabel}>TL;DR</p>
        <Placeholder label="What I tried and what came of it, in 2–3 lines" height={72} />
      </aside>

      <DetailBody>
        <DetailBlock title="The question">
          <Placeholder label="What I wanted to find out" height={96} />
        </DetailBlock>

        <DetailBlock title="Setup">
          <Placeholder label="Stack, constraints" height={96} />
        </DetailBlock>

        <DetailBlock title="What I tried">
          <Placeholder label="Attempts and dead ends" height={120} />
          <pre className={styles.code}>
            <code>{"// Code block\n// ...\n// ..."}</code>
          </pre>
          <Placeholder label="What happened" height={72} />
        </DetailBlock>

        <DetailBlock title="Results">
          <Placeholder label="What worked, any numbers" height={96} />
        </DetailBlock>

        <DetailBlock title="Takeaways">
          <Placeholder label="When I'd use it, what's next" height={96} />
        </DetailBlock>
      </DetailBody>
    </DetailPage>
  );
}
