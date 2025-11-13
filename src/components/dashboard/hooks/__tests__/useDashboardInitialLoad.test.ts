import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardInitialLoad } from "../useDashboardInitialLoad";

// Mock the client
vi.mock("@/lib/client", () => ({
	client: {
		api: {
			coaching: {
				status: {
					$get: vi.fn(),
				},
				"daily-report": {
					$get: vi.fn(),
				},
				context: {
					$get: vi.fn(),
				},
			},
		},
	},
}));

import { client } from "@/lib/client";

describe("useDashboardInitialLoad", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it("3つのAPIを並列で呼び出す", async () => {
		const mockStatus = {
			userContext: "active_user",
			todayFocus: null,
			scoreTrendSummary: null,
			activePlaylist: null,
			latestReport: null,
		};

		const mockReport = {
			id: "report-1",
			userId: "test-user",
			date: new Date(),
			sessionsCount: 5,
			totalDuration: 60,
			performanceRating: "good",
			achievements: [],
			challenges: [],
			tomorrowRecommendations: {
				focusSkills: [],
				recommendedScenarios: [],
				recommendedDuration: 30,
			},
			createdAt: new Date(),
		};

		const mockContext = {
			userId: "test-user",
			currentPhase: "active_training",
			daysInactive: 0,
			newScoresCount: 5,
			hasPlaylist: false,
			isNewUser: false,
		};

		vi.mocked(client.api.coaching.status.$get).mockResolvedValue({
			ok: true,
			json: async () => mockStatus,
		} as any);

		vi.mocked(client.api.coaching["daily-report"].$get).mockResolvedValue({
			ok: true,
			json: async () => mockReport,
		} as any);

		vi.mocked(client.api.coaching.context.$get).mockResolvedValue({
			ok: true,
			json: async () => mockContext,
		} as any);

		const { result } = renderHook(() => useDashboardInitialLoad("test-user"), {
			wrapper,
		});

		// 初期状態はローディング中
		expect(result.current.isLoading).toBe(true);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		// すべてのデータが取得されている
		expect(result.current.status).toEqual(mockStatus);
		expect(result.current.report).toEqual(mockReport);
		expect(result.current.context).toEqual(mockContext);

		// 3つのAPIが呼び出されている
		expect(client.api.coaching.status.$get).toHaveBeenCalledWith({
			query: { userId: "test-user" },
		});
		expect(client.api.coaching["daily-report"].$get).toHaveBeenCalledWith({
			query: { userId: "test-user" },
		});
		expect(client.api.coaching.context.$get).toHaveBeenCalledWith({
			query: { userId: "test-user" },
		});
	});

	it("いずれかのAPIがエラーの場合、isErrorをtrueにする", async () => {
		vi.mocked(client.api.coaching.status.$get).mockRejectedValue(
			new Error("API error"),
		);

		vi.mocked(client.api.coaching["daily-report"].$get).mockResolvedValue({
			ok: true,
			json: async () => ({}),
		} as any);

		vi.mocked(client.api.coaching.context.$get).mockResolvedValue({
			ok: true,
			json: async () => ({}),
		} as any);

		const { result } = renderHook(() => useDashboardInitialLoad("test-user"), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});
	});

	it("すべてのクエリが完了するまでisLoadingがtrueのまま", async () => {
		// 遅延モック（status APIのみ遅延）
		vi.mocked(client.api.coaching.status.$get).mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(
						() =>
							resolve({
								ok: true,
								json: async () => ({}),
							} as any),
						100,
					),
				),
		);

		vi.mocked(client.api.coaching["daily-report"].$get).mockResolvedValue({
			ok: true,
			json: async () => ({}),
		} as any);

		vi.mocked(client.api.coaching.context.$get).mockResolvedValue({
			ok: true,
			json: async () => ({}),
		} as any);

		const { result } = renderHook(() => useDashboardInitialLoad("test-user"), {
			wrapper,
		});

		// 最初はローディング中
		expect(result.current.isLoading).toBe(true);

		// すべて完了するまで待つ
		await waitFor(
			() => {
				expect(result.current.isLoading).toBe(false);
			},
			{ timeout: 200 },
		);
	});
});
