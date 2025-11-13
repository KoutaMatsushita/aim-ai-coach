import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScoreAnalysisCard } from "../ScoreAnalysisCard";

// Mock useScoreAnalysis hook
vi.mock("../hooks/useScoreAnalysis", () => ({
	useScoreAnalysis: vi.fn(),
}));

// Import after mocking
import { useScoreAnalysis } from "../hooks/useScoreAnalysis";

describe("ScoreAnalysisCard", () => {
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

	it("分析実行ボタンを表示する", () => {
		vi.mocked(useScoreAnalysis).mockReturnValue({
			analysis: undefined,
			isLoading: false,
			isError: false,
			error: null,
			executeAnalysis: vi.fn(),
			cancelAnalysis: vi.fn(),
		});

		renderWithProvider(<ScoreAnalysisCard userId="test-user" />);

		expect(
			screen.getByRole("button", { name: /分析実行/i }),
		).toBeInTheDocument();
	});

	it("ローディング中はスピナーとキャンセルボタンを表示する", () => {
		vi.mocked(useScoreAnalysis).mockReturnValue({
			analysis: undefined,
			isLoading: true,
			isError: false,
			error: null,
			executeAnalysis: vi.fn(),
			cancelAnalysis: vi.fn(),
		});

		renderWithProvider(<ScoreAnalysisCard userId="test-user" />);

		expect(screen.getByText(/分析中/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /キャンセル/i }),
		).toBeInTheDocument();
	});

	it("エラー時はエラーメッセージとリトライボタンを表示する", () => {
		vi.mocked(useScoreAnalysis).mockReturnValue({
			analysis: undefined,
			isLoading: false,
			isError: true,
			error: new Error("API error"),
			executeAnalysis: vi.fn(),
			cancelAnalysis: vi.fn(),
		});

		renderWithProvider(<ScoreAnalysisCard userId="test-user" />);

		expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /リトライ/i }),
		).toBeInTheDocument();
	});

	it("分析ボタンクリックでexecuteAnalysisを呼び出す", async () => {
		const user = userEvent.setup();
		const executeAnalysis = vi.fn();

		vi.mocked(useScoreAnalysis).mockReturnValue({
			analysis: undefined,
			isLoading: false,
			isError: false,
			error: null,
			executeAnalysis,
			cancelAnalysis: vi.fn(),
		});

		renderWithProvider(<ScoreAnalysisCard userId="test-user" />);

		const button = screen.getByRole("button", { name: /分析実行/i });
		await user.click(button);

		expect(executeAnalysis).toHaveBeenCalledTimes(1);
	});

	it("キャンセルボタンクリックでcancelAnalysisを呼び出す", async () => {
		const user = userEvent.setup();
		const cancelAnalysis = vi.fn();

		vi.mocked(useScoreAnalysis).mockReturnValue({
			analysis: undefined,
			isLoading: true,
			isError: false,
			error: null,
			executeAnalysis: vi.fn(),
			cancelAnalysis,
		});

		renderWithProvider(<ScoreAnalysisCard userId="test-user" />);

		const button = screen.getByRole("button", { name: /キャンセル/i });
		await user.click(button);

		expect(cancelAnalysis).toHaveBeenCalledTimes(1);
	});
});
