import Section from "./Section";
import styles from "./Process.module.css";

const steps = [
  { title: "Understand", line: "What hurts, and why it matters." },
  { title: "Shape", line: "The smallest thing worth building." },
  { title: "Ship", line: "End to end. Small steps. Real users." },
  { title: "Measure", line: "Did it solve the problem?" },
  { title: "Iterate", line: "Improve, expand or cut. Then back to 01." },
];

export default function Process() {
  return (
    <Section id="process" title="Process">
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.number}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className={styles.title}>{step.title}</h3>
            <p className={styles.line}>{step.line}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
