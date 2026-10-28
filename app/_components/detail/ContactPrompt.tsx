import { getContact } from "@/lib/api";
import ButtonLink from "../ButtonLink";
import styles from "./ContactPrompt.module.css";

export default async function ContactPrompt() {
  const contact = await getContact();

  return (
    <section className={styles.contact} aria-label="Contact">
      <p className={styles.prompt}>{contact.prompt}</p>
      <ButtonLink href={`mailto:${contact.email}`}>Get in touch</ButtonLink>
    </section>
  );
}
