import styles from "./DraftBadge.module.css";

// Marks the drafts and scheduled items that only `next dev` shows
export default function DraftBadge({
  item,
}: {
  item: { published: boolean; date?: string };
}) {
  if (item.published) return null;
  return (
    <span className={styles.badge}>{item.date ? "Scheduled" : "Draft"}</span>
  );
}
