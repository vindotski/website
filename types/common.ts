// Types shared across the site, outside any one feature

export type Image = {
  src: string;
  alt: string;
};

export type YearRange = {
  start: number;
  // Omitted while ongoing ("2021–present")
  end?: number;
};

export type SocialName = "GitHub" | "LinkedIn" | "Figma";
