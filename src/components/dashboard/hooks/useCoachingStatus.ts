import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/client";
import type { CoachingStatus } from "../../../../api/langgraph/types";

export interface UseCoachingStatusResult {
	status: CoachingStatus | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useCoachingStatus(userId: string): UseCoachingStatusResult {
	const {
		data: status,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["coaching", "status", userId],
		queryFn: async () => {
			const res = await client.api.coaching.status.$get({
				query: { userId },
			});

			if (!res.ok) {
				throw new Error(`API error: ${res.status}`);
			}

			return await res.json();
		},
		staleTime: 5 * 60 * 1000, // 5分
		gcTime: 10 * 60 * 1000, // 10分
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});

	return {
		status,
		isLoading,
		isError,
		error: error as Error | null,
		refetch,
	};
}
