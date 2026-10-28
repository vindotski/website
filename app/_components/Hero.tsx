import Image from "next/image";
import { getContact, getHero } from "@/lib/api";
import portraitCutout from "@/public/images/portrait-cutout.png";
import portrait from "@/public/images/portrait.jpg";
import ButtonLink from "./ButtonLink";
import styles from "./Hero.module.css";

export default async function Hero() {
  const [hero, contact] = await Promise.all([getHero(), getContact()]);

  return (
    <section className={styles.hero} aria-label="Introduction">
      <div className={styles.text}>
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {hero.availability}
        </p>
        <h1 className={styles.headline}>{hero.headline}</h1>
        <div className={styles.actions}>
          <ButtonLink href="#work">See work</ButtonLink>
          <ButtonLink href={`mailto:${contact.email}`} variant="secondary">
            Get in touch
          </ButtonLink>
        </div>
      </div>
      {/* Phones show the cut-out above the text, wide screens the photo beside
          it. Each loads lazily, so only the one on screen is downloaded */}
      <Image
        src={portraitCutout}
        alt="Ivan Vinski"
        sizes="112px"
        className={styles.cutout}
      />
      <Image
        src={portrait}
        alt="Ivan Vinski"
        placeholder="blur"
        sizes="380px"
        className={styles.portrait}
      />
      <a href="#work" className={styles.cue} aria-label="Scroll to work">
        ↓
      </a>
    </section>
  );
}
