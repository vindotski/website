import type { DefaultOptions } from "@tanstack/react-query";

// Defaults for every query, as in bulletproof-react. Retrying is up to each
// query: most errors here (401, 400) won't fix themselves
export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60,
  },
} satisfies DefaultOptions;

// A hook's options, minus the key and function its query options set
export type QueryConfig<T extends (...args: never[]) => unknown> = Omit<
  ReturnType<T>,
  "queryKey" | "queryFn"
>;
