import Placeholder from "../Placeholder";
import styles from "./Facts.module.css";

export default function Facts({ labels }: { labels: string[] }) {
  return (
    <dl className={styles.facts}>
      {labels.map((label) => (
        <div key={label} className={styles.fact}>
          <dt>{label}</dt>
          <dd>
            <Placeholder label="Value" height={24} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
