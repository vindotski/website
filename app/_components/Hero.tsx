import Placeholder from "./Placeholder";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero} aria-label="Introduction">
      <p className={styles.intro}>Ivan Vinski · Software Engineer</p>
      <div className={styles.headline}>
        <Placeholder label="Headline" height={160} />
      </div>
      <a href="#contact" className={styles.cta}>
        Get in touch
      </a>
    </section>
  );
}
