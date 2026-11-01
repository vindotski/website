import { QueryClient } from "@tanstack/react-query";

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			// Avoid refetching SSR-hydrated data immediately on the client.
			queries: { staleTime: 30_000 },
		},
	});

	return {
		queryClient,
	};
}
