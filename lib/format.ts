import type { YearRange } from "@/types/common";

// "2022–2025", "2025–present", or "2025" when it started and ended that year
export function formatYears({ start, end }: YearRange) {
  if (end === undefined) return `${start}–present`;
  if (end === start) return `${start}`;
  return `${start}–${end}`;
}

// Stack name as a tag: "React Native" → "react-native", "Node.js" → "node.js"
export function toTag(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// "Nov 10, 2026"; UTC so the day doesn't shift with the server's time zone
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
