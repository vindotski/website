import Placeholder from "../../_components/Placeholder";
import Tags from "../../_components/Tags";
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
    </DetailPage>
  );
}
