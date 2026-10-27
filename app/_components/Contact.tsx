import Placeholder from "./Placeholder";
import Section from "./Section";
import styles from "./Contact.module.css";

export default function Contact() {
  return (
    <Section id="contact" title="Contact" centerTitle>
      <div className={styles.layout}>
        <Placeholder label="Short invitation to get in touch" height={48} />
        <form className={styles.form}>
          <label className={styles.field}>
            Name
            <input type="text" name="name" autoComplete="name" required />
          </label>
          <label className={styles.field}>
            Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label className={styles.field}>
            Message
            <textarea name="message" rows={6} required />
          </label>
          {/* Not a submit button until sending is implemented */}
          <button type="button" className={styles.submit}>
            Send
          </button>
        </form>
        <Placeholder label="Email address · social links" height={32} />
      </div>
    </Section>
  );
}
