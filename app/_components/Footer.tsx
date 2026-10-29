import { cacheLife } from "next/cache";
import Image from "next/image";
import { getContact, getSocials } from "@/lib/api";
import portrait from "@/public/images/portrait.jpg";
import ContactActions from "./ContactActions";
import LocalTime from "./LocalTime";
import SocialIcon from "./SocialIcon";
import styles from "./Footer.module.css";

// Cached so the page can still be prerendered; refreshed daily for the new year
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

// Ends every page: the contact prompt, then the small print.
// Every "Get in touch" link lands here
export default async function Footer() {
  const [contact, socials] = await Promise.all([getContact(), getSocials()]);

  return (
    <footer id="contact" className={styles.footer}>
      <section className={styles.contact} aria-label="Contact">
        {/* I ask the question; the buttons are the answers */}
        <div className={styles.chat}>
          <Image
            src={portrait}
            alt="Ivan Vinski"
            sizes="64px"
            className={styles.avatar}
          />
          <p className={styles.bubble}>{contact.prompt}</p>
          <div className={styles.actions}>
            <ContactActions tone="dark" />
          </div>
        </div>
        <dl className={styles.details}>
          {contact.details.map((detail) => (
            <div key={detail.label}>
              <dt className={styles.detailLabel}>{detail.label}</dt>
              <dd className={styles.detailValue}>
                {detail.value}
                {detail.timeZone && <LocalTime timeZone={detail.timeZone} />}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <div className={styles.bottom}>
        <p className={styles.copyright}>
          © <CurrentYear /> Ivan Vinski
        </p>
        <ul className={styles.socials}>
          {socials.map((social) => (
            <li key={social.name}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className={styles.social}
              >
                <SocialIcon name={social.name} />
              </a>
            </li>
          ))}
        </ul>
        {/* Browsers scroll to the top for #top when no element has that id */}
        <a href="#top" className={styles.top}>
          Back to top
        </a>
      </div>
    </footer>
  );
}
