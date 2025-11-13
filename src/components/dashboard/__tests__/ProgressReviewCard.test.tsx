import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserContext } from "../../../../api/langgraph/types";
import { ProgressReviewCard } from "../ProgressReviewCard";

// Mock hooks
vi.mock("../hooks/useProgressReview", () => ({
	useProgressReview: vi.fn(),
}));

import { useProgressReview } from "../hooks/useProgressReview";

describe("ProgressReviewCard", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		vi.clearAllMocks();
	});

	const renderWithProvider = (ui: React.ReactElement) => {
		return render(
			<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
		);
	};

	it("userContextが'returning_user'でない場合はnullを返す", () => {
		vi.mocked(useProgressReview).mockReturnValue({
			review: undefined,
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		const { container } = renderWithProvider(
			<ProgressReviewCard userId="test-user" userContext="active_user" />,
		);

		expect(container.firstChild).toBeNull();
	});

	it("userContextが'returning_user'の場合はレビューカードを表示する", () => {
		const mockReview = {
			userId: "test-user",
			reviewPeriod: {
				start: new Date("2024-12-01"),
				end: new Date("2025-01-10"),
				days: 40,
			},
			beforePausePerformance: {
				avgScore: 850,
				strongSkills: ["tracking", "flicking"],
				activityFrequency: 5,
			},
			goalProgress: [
				{
					goalId: "goal-1",
					goalTitle: "1000スコア達成",
					initialValue: 800,
					currentValue: 900,
					targetValue: 1000,
					progressPercent: 50,
					status: "on_track" as const,
				},
			],
			rehabilitationPlan: ["基礎練習を10分", "中級シナリオを15分"],
			motivationalMessage: "復帰おめでとうございます!",
			generatedAt: new Date("2025-01-10"),
		};

		vi.mocked(useProgressReview).mockReturnValue({
			review: mockReview,
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		renderWithProvider(
			<ProgressReviewCard userId="test-user" userContext="returning_user" />,
		);

		expect(screen.getByText(/振り返りレビュー/i)).toBeInTheDocument();
		expect(screen.getByText(/40/)).toBeInTheDocument();
	});

	it("ローディング中はSkeletonを表示する", () => {
		vi.mocked(useProgressReview).mockReturnValue({
			review: undefined,
			isLoading: true,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		renderWithProvider(
			<ProgressReviewCard userId="test-user" userContext="returning_user" />,
		);

		// Skeletonがレンダリングされることを確認
		expect(screen.getByText(/振り返りレビュー/i)).toBeInTheDocument();
	});

	it("エラー時はエラーメッセージとリトライボタンを表示する", () => {
		vi.mocked(useProgressReview).mockReturnValue({
			review: undefined,
			isLoading: false,
			isError: true,
			error: new Error("API error"),
			refetch: vi.fn(),
		});

		renderWithProvider(
			<ProgressReviewCard userId="test-user" userContext="returning_user" />,
		);

		expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /リトライ/i }),
		).toBeInTheDocument();
	});

	it("目標進捗をProgressバーで表示する", () => {
		const mockReview = {
			userId: "test-user",
			reviewPeriod: {
				start: new Date("2024-12-01"),
				end: new Date("2025-01-10"),
				days: 40,
			},
			beforePausePerformance: {
				avgScore: 850,
				strongSkills: ["tracking"],
				activityFrequency: 5,
			},
			goalProgress: [
				{
					goalId: "goal-1",
					goalTitle: "1000スコア達成",
					initialValue: 800,
					currentValue: 900,
					targetValue: 1000,
					progressPercent: 50,
					status: "on_track" as const,
				},
			],
			rehabilitationPlan: ["基礎練習"],
			motivationalMessage: "がんばりましょう!",
			generatedAt: new Date("2025-01-10"),
		};

		vi.mocked(useProgressReview).mockReturnValue({
			review: mockReview,
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		});

		renderWithProvider(
			<ProgressReviewCard userId="test-user" userContext="returning_user" />,
		);

		expect(screen.getByText("1000スコア達成")).toBeInTheDocument();
		expect(screen.getByText(/50/)).toBeInTheDocument();
	});
});
