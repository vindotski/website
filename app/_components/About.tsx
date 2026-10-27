import Placeholder from "./Placeholder";
import Section from "./Section";
import styles from "./About.module.css";

export default function About() {
  return (
    <Section id="about" title="About">
      <div className={styles.layout}>
        <Placeholder label="Portrait" height={320} />
        <div className={styles.text}>
          <Placeholder label="Intro paragraph" height={96} />
          <Placeholder label="Paragraph" height={96} />
          <Placeholder label="Closing line" height={32} />
        </div>
      </div>
    </Section>
  );
}
