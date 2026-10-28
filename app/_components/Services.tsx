import Link from "next/link";
import { Fragment } from "react";
import { getServices } from "@/lib/api";
import Section from "./Section";
import styles from "./Services.module.css";

export default async function Services() {
  const services = await getServices();

  return (
    <Section id="services" title="Services">
      <ul className={styles.grid}>
        {services.map((service) => (
          <li key={service.name} className={styles.service}>
            <p className={styles.name}>{service.name}</p>
            <h3 className={styles.headline}>{service.headline}</h3>
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
    </Section>
  );
}
