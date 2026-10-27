import Placeholder from "../../_components/Placeholder";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import Facts from "../../_components/detail/Facts";
import styles from "./page.module.css";

export default function SampleTemplate() {
  return (
    <DetailPage backHref="/#samples" backLabel="Samples">
      <DetailIntro title="Sample name">
        <Placeholder label="One-line summary" height={32} />
        <div className={styles.links}>
          <Placeholder label="Live demo ↗" height={24} />
          <Placeholder label="Source ↗" height={24} />
        </div>
      </DetailIntro>

      <Facts labels={["Type", "Stack", "Year", "Status"]} />

      <Placeholder label="Hero image" height={420} />
    </DetailPage>
  );
}
