import Placeholder from "../../_components/Placeholder";
import ContactPrompt from "../../_components/detail/ContactPrompt";
import { DetailBlock, DetailBody } from "../../_components/detail/DetailBody";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import Facts from "../../_components/detail/Facts";
import NextLink from "../../_components/detail/NextLink";
import styles from "./page.module.css";

const decisions = ["Decision 1", "Decision 2", "Decision 3"];

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

      <Facts
        facts={["Type", "Stack", "Year", "Status"].map((label) => ({
          label,
          value: <Placeholder label="Value" height={24} />,
        }))}
      />

      <Placeholder label="Hero image" height={420} />

      <DetailBody>
        <DetailBlock title="Why I built it">
          <Placeholder label="The itch, who it's for" height={96} />
        </DetailBlock>

        <DetailBlock title="Architecture">
          <Placeholder label="How the pieces fit together" height={96} />
          <Placeholder label="Diagram" height={320} />
        </DetailBlock>

        <DetailBlock title="Key decisions">
          {decisions.map((decision) => (
            <div key={decision} className={styles.decision}>
              <h3>{decision}</h3>
              <Placeholder label="The choice and its trade-off" height={72} />
            </div>
          ))}
        </DetailBlock>

        <DetailBlock title="What I'd do next">
          <Placeholder label="Next steps, open questions" height={96} />
        </DetailBlock>
      </DetailBody>

      <NextLink href="/samples/template" name="Sample name" />

      <ContactPrompt />
    </DetailPage>
  );
}
