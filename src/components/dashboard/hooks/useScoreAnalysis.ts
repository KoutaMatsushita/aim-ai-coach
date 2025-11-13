import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/client";
import type { ScoreAnalysis } from "../../../../api/langgraph/types";

export interface UseScoreAnalysisResult {
	analysis: ScoreAnalysis | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	executeAnalysis: () => void;
	cancelAnalysis: () => void;
}

export function useScoreAnalysis(userId: string): UseScoreAnalysisResult {
	const queryClient = useQueryClient();

	const {
		data: analysis,
		isPending: isLoading,
		isError,
		error,
		mutate: executeAnalysis,
		reset: cancelAnalysis,
	} = useMutation({
		mutationFn: async () => {
			const res = await client.api.coaching.analysis.$post({
				json: { userId },
			});

			if (!res.ok) {
				throw new Error(`API error: ${res.status}`);
			}

			return await res.json();
		},
		onSuccess: (data) => {
			// キャッシュ更新
			queryClient.setQueryData(["coaching", "analysis", userId], data);
		},
		// POSTはユーザーアクション必要、自動リトライしない
		retry: false,
	});

	return {
		analysis,
		isLoading,
		isError,
		error: error as Error | null,
		executeAnalysis,
		cancelAnalysis,
	};
}
