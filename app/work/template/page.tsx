import Placeholder from "../../_components/Placeholder";
import ContactPrompt from "../../_components/detail/ContactPrompt";
import { DetailBlock, DetailBody } from "../../_components/detail/DetailBody";
import DetailIntro from "../../_components/detail/DetailIntro";
import DetailPage from "../../_components/detail/DetailPage";
import Facts from "../../_components/detail/Facts";
import NextLink from "../../_components/detail/NextLink";
import styles from "./page.module.css";

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
      </DetailBody>

      <NextLink href="/work/template" name="Project name" />

      <ContactPrompt />
    </DetailPage>
  );
}
