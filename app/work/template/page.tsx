import Placeholder from "../../_components/Placeholder";
import ContactPrompt from "../../_components/detail/ContactPrompt";
import { DetailBlock, DetailBody } from "../../_components/detail/DetailBody";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import Facts from "../../_components/detail/Facts";
import NextLink from "../../_components/detail/NextLink";
import styles from "./page.module.css";

const highlights = ["Highlight 1", "Highlight 2", "Highlight 3"];

export default function WorkTemplate() {
  return (
    <DetailPage backHref="/#work" backLabel="Work">
      <DetailIntro title="Project name">
        <Placeholder label="One-line summary" height={32} />
        <Placeholder label="Visit product ↗" height={24} />
      </DetailIntro>

      <Facts labels={["Role", "Company", "Years", "Stack"]} />

      <Placeholder label="Hero image" height={420} />

      <aside className={styles.impact} aria-label="Impact">
        <p className={styles.impactLabel}>Impact</p>
        <Placeholder label="One or two lines on what it changed" height={72} />
      </aside>

      <DetailBody>
        <DetailBlock title="Context">
          <Placeholder label="The product, its users, the problem" height={120} />
        </DetailBlock>

        <DetailBlock title="My role">
          <Placeholder label="What I owned, the team around me" height={96} />
        </DetailBlock>

        <DetailBlock title="What I built">
          {highlights.map((highlight) => (
            <div key={highlight} className={styles.highlight}>
              <h3>{highlight}</h3>
              <Placeholder label="What and why" height={72} />
              <Placeholder label="Image" height={280} />
            </div>
          ))}
        </DetailBlock>

        <DetailBlock title="Outcome">
          <Placeholder label="What it changed" height={96} />
        </DetailBlock>
      </DetailBody>

      <NextLink href="/work/template" name="Project name" />

      <ContactPrompt />
    </DetailPage>
  );
}
