import type { DefaultOptions, UseMutationOptions } from "@tanstack/react-query";

// Defaults for every query, as in bulletproof-react. Retrying is up to each
// query: most errors here (401, 400) won't fix themselves
export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60,
  },
} satisfies DefaultOptions;

// The resolved value of an API function
export type ApiFnReturnType<FnType extends (...args: never[]) => Promise<unknown>> =
  Awaited<ReturnType<FnType>>;

// A hook's options, minus the key and function its query options set
export type QueryConfig<T extends (...args: never[]) => unknown> = Omit<
  ReturnType<T>,
  "queryKey" | "queryFn"
>;

export type MutationConfig<
  MutationFnType extends (...args: never[]) => Promise<unknown>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;
