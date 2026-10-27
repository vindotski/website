import styles from "./Placeholder.module.css";

type PlaceholderProps = {
  label: string;
  height?: number;
};

export default function Placeholder({ label, height = 48 }: PlaceholderProps) {
  return (
    <div className={styles.placeholder} style={{ minHeight: height }}>
      {label}
    </div>
  );
}
