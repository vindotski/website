import Placeholder from "./Placeholder";
import Section from "./Section";
import styles from "./Services.module.css";

const pillars = ["Pillar 1", "Pillar 2", "Pillar 3"];

export default function Services() {
  return (
    <Section id="services" title="Services">
      <ul className={styles.grid}>
        {pillars.map((pillar) => (
          <li key={pillar} className={styles.pillar}>
            <Placeholder label={`${pillar} · icon`} height={48} />
            <Placeholder label="Title" height={28} />
            <Placeholder label="One or two lines" height={56} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
