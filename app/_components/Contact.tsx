import ContactPrompt from "./detail/ContactPrompt";
import styles from "./Contact.module.css";

// Same prompt as the end of every detail page; #contact links land on it
export default function Contact() {
  return (
    <div id="contact" className={styles.contact}>
      <ContactPrompt />
    </div>
  );
}
