import Image from "next/image";
import { getHero, getSocials } from "@/lib/api";
// TODO: replace with a larger cut-out (1500–2048px); this one is 500px
import portrait from "@/public/images/portrait-cutout.png";
import ButtonLink from "./ButtonLink";
import ScrollLink from "./ScrollLink";
import { ChatIcon } from "./ContactIcons";
import SocialIcon from "./SocialIcon";
import styles from "./Hero.module.css";

export default async function Hero() {
  const [hero, socials] = await Promise.all([getHero(), getSocials()]);
  const linkedIn = socials.find((social) => social.name === "LinkedIn");
  const gitHub = socials.find((social) => social.name === "GitHub");

  return (
    // White on black, edge to edge
    // Phones show a floating Get in touch only while this is out of view
    <div className={styles.band} data-hides-contact>
      <section className={styles.hero} aria-label="Introduction">
        <div className={styles.text}>
          <p className={styles.eyebrow}>{hero.title}</p>
          <h1 className={styles.headline}>{hero.headline}</h1>
          {/* Phones only; tablets and up show it in the header */}
          <p className={styles.subline}>{hero.availability}</p>
          <div className={styles.actions}>
            {/* Leads to the contact prompt in the footer */}
            <ButtonLink href="#contact" icon={<ChatIcon />}>
              Get in touch
            </ButtonLink>
            {linkedIn && (
              <ButtonLink
                href={linkedIn.href}
                variant="secondary"
                icon={<SocialIcon name="LinkedIn" />}
                newTab
              >
                LinkedIn
              </ButtonLink>
            )}
            {/* Wide screens: GitHub joins the buttons once the cue is centred */}
            {gitHub && (
              <ButtonLink
                href={gitHub.href}
                variant="secondary"
                icon={<SocialIcon name="GitHub" />}
                label="GitHub"
                newTab
              />
            )}
          </div>
        </div>
        {/* On top of the text on phones, fading into it; beside it from tablets
            up, where the wrapper steps aside */}
        <div className={styles.photo}>
          <Image
            src={portrait}
            alt="Ivan Vinski"
            placeholder="blur"
            sizes="(min-width: 900px) 380px, (min-width: 768px) 280px, 100vw"
            className={styles.portrait}
          />
        </div>
        {/* The scroll cue, with GitHub beside it */}
        <div className={styles.bottom}>
          <ScrollLink href="#work" className={styles.cue}>
            See work
            <span className={styles.arrow} aria-hidden="true">
              ↓
            </span>
          </ScrollLink>
          {/* Phones: GitHub sits by the cue instead of with the buttons */}
          {gitHub && (
            <a
              href={gitHub.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.github}
            >
              <SocialIcon name="GitHub" />
              GitHub
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
