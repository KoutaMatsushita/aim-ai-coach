import { useQueries } from "@tanstack/react-query";
import { client } from "@/lib/client";
import type {
	CoachingStatus,
	DailyReport,
} from "../../../../api/langgraph/types";

interface CoachingContext {
	userId: string;
	currentPhase: string;
	daysInactive: number;
	newScoresCount: number;
	hasPlaylist: boolean;
	isNewUser: boolean;
}

export interface UseDashboardInitialLoadResult {
	status: CoachingStatus | undefined;
	report: DailyReport | undefined;
	context: CoachingContext | undefined;
	isLoading: boolean;
	isError: boolean;
}

/**
 * ダッシュボード初期ロード用カスタムフック
 * status、report、contextの3つのGETエンドポイントを並列呼び出し
 */
export function useDashboardInitialLoad(
	userId: string,
): UseDashboardInitialLoadResult {
	const results = useQueries({
		queries: [
			// Query 1: Coaching Status
			{
				queryKey: ["coaching", "status", userId],
				queryFn: async () => {
					const res = await client.api.coaching.status.$get({
						query: { userId },
					});

					if (!res.ok) {
						throw new Error(`Status API error: ${res.status}`);
					}

					return await res.json();
				},
				staleTime: 5 * 60 * 1000, // 5分
				gcTime: 10 * 60 * 1000, // 10分
				retry: 3,
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			},
			// Query 2: Daily Report
			{
				queryKey: ["coaching", "daily-report", userId],
				queryFn: async () => {
					const res = await client.api.coaching["daily-report"].$get({
						query: { userId },
					});

					if (!res.ok) {
						throw new Error(`Report API error: ${res.status}`);
					}

					return await res.json();
				},
				staleTime: 5 * 60 * 1000,
				gcTime: 10 * 60 * 1000,
				retry: 3,
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			},
			// Query 3: Coaching Context
			{
				queryKey: ["coaching", "context", userId],
				queryFn: async () => {
					const res = await client.api.coaching.context.$get({
						query: { userId },
					});

					if (!res.ok) {
						throw new Error(`Context API error: ${res.status}`);
					}

					return await res.json();
				},
				staleTime: 5 * 60 * 1000,
				gcTime: 10 * 60 * 1000,
				retry: 3,
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			},
		],
	});

	const [statusQuery, reportQuery, contextQuery] = results;

	return {
		status: statusQuery.data as CoachingStatus | undefined,
		report: reportQuery.data as DailyReport | undefined,
		context: contextQuery.data as CoachingContext | undefined,
		// すべてのクエリが完了するまでローディング中
		isLoading:
			statusQuery.isLoading || reportQuery.isLoading || contextQuery.isLoading,
		// いずれかのクエリがエラーの場合はエラー
		isError: statusQuery.isError || reportQuery.isError || contextQuery.isError,
	};
}
