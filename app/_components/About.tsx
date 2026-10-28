import Image from "next/image";
import { getAbout } from "@/lib/api";
import portrait from "@/public/images/portrait.jpg";
import Section from "./Section";
import styles from "./About.module.css";

export default async function About() {
  const about = await getAbout();

  return (
    <Section id="about" title="About">
      <div className={styles.layout}>
        <Image
          src={portrait}
          alt="Ivan Vinski"
          placeholder="blur"
          // Never wider than 360px (see .portrait)
          sizes="360px"
          className={styles.portrait}
        />
        <div className={styles.text}>
          <p className={styles.intro}>{about.intro}</p>
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className={styles.closing}>{about.closing}</p>
        </div>
      </div>
    </Section>
  );
}
