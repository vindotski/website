import { Badge } from "@/components/ui/badge";

// Marks the drafts and scheduled items that only `next dev` shows
export default function DraftBadge({
  item,
}: {
  item: { published: boolean; date?: string };
}) {
  if (item.published) return null;
  return (
    <Badge variant="secondary" className="self-start">
      {item.date ? "Scheduled" : "Draft"}
    </Badge>
  );
}
