import Link from "next/link";
import { Fragment } from "react";
import { getServices } from "@/lib/api";
import Section from "./Section";
import styles from "./Services.module.css";

const steps = [
  { title: "Understand", line: "What hurts, and why it matters." },
  { title: "Shape", line: "The smallest thing worth building." },
  { title: "Ship", line: "End to end. Small steps. Real users." },
  { title: "Measure", line: "Did it solve the problem?" },
  { title: "Iterate", line: "Improve, expand or cut. Then back to 01." },
];

// What I do and how I work, side by side on wider screens
export default async function Services() {
  const services = await getServices();

  return (
    <Section id="services" title="Services">
      <div className={styles.layout}>
        <div className={styles.offers}>
          <h3 className={styles.subhead}>What I do</h3>
          <ul className={styles.list}>
            {services.map((service) => (
              <li key={service.name} className={styles.service}>
                <p className={styles.name}>{service.name}</p>
                <h4 className={styles.headline}>{service.headline}</h4>
                <p className={styles.line}>{service.line}</p>
                {service.proof.length > 0 && (
                  <p className={styles.proof}>
                    See:{" "}
                    {service.proof.map((item, index) => (
                      <Fragment key={item.href}>
                        {index > 0 && " · "}
                        <Link href={item.href}>{item.name}</Link>
                      </Fragment>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Keeps its own id, so links to /#process still land here */}
        <div id="process" className={styles.process}>
          <h3 className={styles.subhead}>How I work</h3>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.number}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepLine}>{step.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
