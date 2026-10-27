import ButtonLink from "../ButtonLink";
import Placeholder from "../Placeholder";
import styles from "./ContactPrompt.module.css";

export default function ContactPrompt() {
  return (
    <section className={styles.contact} aria-label="Contact">
      <Placeholder label="Short line inviting a conversation" height={48} />
      <ButtonLink href="/#contact">Get in touch</ButtonLink>
    </section>
  );
}
