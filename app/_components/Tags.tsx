import styles from "./Tags.module.css";

export default function Tags({ tags }: { tags: string[] }) {
  return (
    <span className={styles.tags}>
      {tags.map((tag) => `#${tag}`).join(" ")}
    </span>
  );
}
