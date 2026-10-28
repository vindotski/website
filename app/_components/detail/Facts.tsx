import styles from "./Facts.module.css";

type Fact = {
  label: string;
  value: React.ReactNode;
};

export default function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className={styles.facts}>
      {facts.map((fact) => (
        <div key={fact.label} className={styles.fact}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
