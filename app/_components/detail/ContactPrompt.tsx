import { getContact } from "@/lib/api";
import ContactActions from "../ContactActions";
import styles from "./ContactPrompt.module.css";

export default async function ContactPrompt() {
  const contact = await getContact();

  return (
    <section className={styles.contact} aria-label="Contact">
      <p className={styles.prompt}>{contact.prompt}</p>
      <div className={styles.actions}>
        <ContactActions tone="dark" />
      </div>
    </section>
  );
}
