export type Image = {
  src: string;
  alt: string;
};

export type YearRange = {
  start: number;
  // Omitted while ongoing ("2021–present")
  end?: number;
};

// Display order is the order of the data array; "Next" is the following item
export type Work = {
  slug: string;
  name: string;
  summary: string;
  company: string;
  role: string;
  years: YearRange;
  stack: string[];
  productUrl?: string;
  image: Image;
  impact: string;
  context: string;
  myRole: string;
};

export type SampleType = "Frontend" | "Fullstack" | "Product";

export type SampleStatus = "Live" | "In progress" | "Archived";

export type Decision = {
  title: string;
  body: string;
};

export type Sample = {
  slug: string;
  name: string;
  summary: string;
  type: SampleType;
  stack: string[];
  year: number;
  status: SampleStatus;
  demoUrl: string;
  sourceUrl?: string;
  image: Image;
  why: string;
  architecture: string;
  diagram: Image;
  decisions: Decision[];
  next: string;
};

// Front matter of a post's MDX file; the body sections are its ## headings
export type PostMeta = {
  // From the file name
  slug: string;
  title: string;
  // ISO date, e.g. "2026-11-03"; posts sort by it
  date: string;
  // Without "#"
  tags: string[];
  repoUrl?: string;
  demoUrl?: string;
  tldr: string;
};
