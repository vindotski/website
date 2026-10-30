import { Badge } from "@/components/ui/badge";

export default function Tags({ tags }: { tags: string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline">
          #{tag}
        </Badge>
      ))}
    </span>
  );
}
