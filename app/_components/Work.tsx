import Placeholder from "./Placeholder";
import Section from "./Section";
import styles from "./Work.module.css";

const projects = ["HuddleOS", "Odjeca.hr", "Sokobanko"];

export default function Work() {
  return (
    <Section id="work" title="Work">
      <ul className={styles.grid}>
        {projects.map((project) => (
          <li key={project} className={styles.card}>
            <Placeholder label="Image" height={180} />
            <h3 className={styles.name}>{project}</h3>
            <Placeholder label="Company · role · years" height={24} />
            <Placeholder label="Summary" height={72} />
            <Placeholder label="Stack" height={24} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
