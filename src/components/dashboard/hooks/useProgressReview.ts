import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/client";
import type { ProgressReport } from "../../../../api/langgraph/types";

export interface UseProgressReviewResult {
	review: ProgressReport | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useProgressReview(
	userId: string,
	enabled: boolean,
): UseProgressReviewResult {
	const {
		data: review,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["coaching", "progress-review", userId],
		queryFn: async () => {
			const res = await client.api.coaching.progress.review.$get({
				query: { userId },
			});

			if (!res.ok) {
				throw new Error(`API error: ${res.status}`);
			}

			return await res.json();
		},
		enabled, // userContext === "returning_user" のときのみ実行
		staleTime: 5 * 60 * 1000, // 5分
		gcTime: 10 * 60 * 1000, // 10分
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
	});

	return {
		review,
		isLoading,
		isError,
		error: error as Error | null,
		refetch,
	};
}
