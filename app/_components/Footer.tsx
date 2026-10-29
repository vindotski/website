import { cacheLife } from "next/cache";
import Image from "next/image";
import { getContact, getSocials } from "@/lib/api";
import portrait from "@/public/images/portrait.jpg";
import ContactActions from "./ContactActions";
import { PersonIcon } from "./ContactIcons";
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
    <footer id="contact" className={styles.footer} data-hides-contact>
      <section className={styles.contact} aria-label="Contact">
        {/* I ask the question; the buttons are the answers */}
        {/* Ivan asks; the visitor's answer is the buttons */}
        <div className={styles.chat}>
          <span className={styles.who}>Ivan</span>
          <Image
            src={portrait}
            alt="Ivan Vinski"
            sizes="64px"
            className={styles.avatar}
          />
          <p className={styles.bubble}>{contact.prompt}</p>
          <div className={styles.reply}>
            <div className={styles.actions}>
              <ContactActions tone="dark" />
            </div>
          </div>
          {/* The visitor, with "You" right under the avatar */}
          <span className={styles.visitorWrap}>
            <span className={styles.visitor} aria-hidden="true">
              <PersonIcon />
            </span>
            <span className={styles.whoYou}>You</span>
          </span>
        </div>
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
