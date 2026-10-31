// Marks an element for Vercel Analytics: a click on it sends `event` with the
// other fields as properties (AnalyticsEvents adds page and path). Plain data
// attributes, so server components can use it. Plus allows 8 properties per
// event; never put personal data in them
export type Track = { event: string } & Record<string, string>;

export function trackAttributes(track?: Track): Record<string, string> {
  if (!track) return {};
  const { event, ...properties } = track;
  return {
    "data-track": event,
    ...Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        `data-track-${key}`,
        value,
      ]),
    ),
  };
}
