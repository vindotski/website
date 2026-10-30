import Image from "next/image";
import portrait from "@/public/images/portrait-teaser.png";
import ButtonLink from "../(site)/_components/ButtonLink";
import { MailIcon } from "../(site)/_components/ContactIcons";
import SocialIcon from "../(site)/_components/SocialIcon";
import styles from "./page.module.css";

// Shown by the auth guard at / until launch. A copy of the site's hero, made
// to stand alone: no header to carry the name, no footer to scroll to, and
// nothing below it to see. Indexable, so it has real text for search engines.
// The text, links and portrait are hardcoded on purpose, so the public page
// stays fixed while the site's data and images change
export default function TeaserPage() {
  return (
    // White on black, edge to edge
    <main className={styles.band}>
      <section className={styles.hero} aria-label="Introduction">
        <div className={styles.text}>
          <p className={styles.eyebrow}>Ivan Vinski · Product Engineer</p>
          <h1 className={styles.headline}>
            Frontend by trade, full-stack by habit, product by focus.
          </h1>
          <p className={styles.subline}>
            Available for frontend and product work.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="mailto:ivan@vin.ski" icon={<MailIcon />}>
              ivan@vin.ski
            </ButtonLink>
            <ButtonLink
              href="https://www.linkedin.com/in/vindotski"
              variant="secondary"
              icon={<SocialIcon name="LinkedIn" />}
              newTab
            >
              {/* Phones show the icon alone; the text stays for screen readers */}
              <span className={styles.label}>LinkedIn</span>
            </ButtonLink>
            <ButtonLink
              href="https://github.com/vindotski"
              variant="secondary"
              icon={<SocialIcon name="GitHub" />}
              label="GitHub"
              newTab
            />
          </div>
        </div>
        {/* On top of the text on phones, fading into it; beside it from tablets
            up, where the wrapper steps aside */}
        <div className={styles.photo}>
          <Image
            src={portrait}
            alt="Ivan Vinski"
            placeholder="blur"
            // The largest thing on screen, so it loads first
            preload
            sizes="(min-width: 900px) 380px, (min-width: 768px) 280px, 100vw"
            className={styles.portrait}
          />
        </div>
      </section>
      {/* Pinned to the bottom edge, over the layout without moving it */}
      <div className={styles.ticker}>
        {/* Read once by screen readers and search engines */}
        <p className={styles.tickerLabel}>Coming soon</p>
        {/* Two identical halves, so the loop has no seam */}
        <div className={styles.tickerTrack} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i}>Coming soon</span>
          ))}
        </div>
      </div>
    </main>
  );
}
