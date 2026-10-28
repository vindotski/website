import type { MDXComponents } from "mdx/types";

// Required by @next/mdx in the App Router
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
