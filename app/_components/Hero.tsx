import ButtonLink from "./ButtonLink";
import Placeholder from "./Placeholder";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero} aria-label="Introduction">
      <p className={styles.intro}>Ivan Vinski · Software Engineer</p>
      <div className={styles.headline}>
        <Placeholder label="Headline" height={160} />
      </div>
      <ButtonLink href="#contact">Get in touch</ButtonLink>
    </section>
  );
}
