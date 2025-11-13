import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/client";
import type { DailyReport } from "../../../../api/langgraph/types";

export interface UseDailyReportResult {
	report: DailyReport | undefined;
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	refetch: (date?: Date) => void;
}

export function useDailyReport(
	userId: string,
	date?: Date,
): UseDailyReportResult {
	const {
		data: report,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["coaching", "daily-report", userId, date?.toISOString()],
		queryFn: async () => {
			const queryParams: { userId: string; date?: string } = { userId };
			if (date) {
				queryParams.date = date.toISOString().split("T")[0]; // YYYY-MM-DD形式
			}

			const res = await client.api.coaching["daily-report"].$get({
				query: queryParams,
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
		report,
		isLoading,
		isError,
		error: error as Error | null,
		refetch,
	};
}
