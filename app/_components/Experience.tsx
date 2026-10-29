import { getAbout, getExperience } from "@/lib/api";
import { formatYears } from "@/lib/format";
import Section from "./Section";
import styles from "./Experience.module.css";

export default async function Experience() {
  const [about, roles] = await Promise.all([getAbout(), getExperience()]);

  return (
    <Section id="experience" title="Experience">
      <div className={styles.layout}>
        <p className={styles.intro}>{about.intro}</p>
        <ol className={styles.timeline}>
          {roles.map((role) => {
            // No end year means it's the current role
            const current = role.years.end === undefined;
            return (
              <li
                key={`${role.company}-${role.years.start}`}
                className={styles.role}
                data-current={current}
              >
                <div className={styles.roleTop}>
                  <span className={styles.title}>{role.title}</span>
                  <span className={styles.years}>
                    {formatYears(role.years)}
                  </span>
                </div>
                <span className={styles.company}>{role.company}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Section>
  );
}
