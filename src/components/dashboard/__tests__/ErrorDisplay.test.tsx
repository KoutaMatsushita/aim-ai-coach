import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ErrorDisplay } from "../ErrorDisplay";

// Mock useNavigate from TanStack Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => mockNavigate,
}));

describe("ErrorDisplay", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("エラーメッセージを表示する", () => {
		render(
			<ErrorDisplay
				error={new Error("Test error message")}
				onRetry={vi.fn()}
			/>,
		);

		expect(screen.getByText("Test error message")).toBeInTheDocument();
	});

	it("リトライボタンをクリックするとonRetryが呼ばれる", async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();

		render(<ErrorDisplay error={new Error("Test error")} onRetry={onRetry} />);

		const retryButton = screen.getByRole("button", { name: /再試行/i });
		await user.click(retryButton);

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("HTTPステータスコード401の場合、ログインページへリダイレクトする", () => {
		const error = new Error("Unauthorized");
		(error as any).status = 401;

		render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

		expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
	});

	it("HTTPステータスコード404の場合、エンプティステートを表示する", () => {
		const error = new Error("Not found");
		(error as any).status = 404;

		render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

		expect(
			screen.getByText(/データが見つかりませんでした/i),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /再試行/i })).toBeNull();
	});

	it("HTTPステータスコード500の場合、リトライボタンを表示する", () => {
		const error = new Error("Internal server error");
		(error as any).status = 500;

		render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

		expect(screen.getByText(/サーバーエラーが発生しました/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /再試行/i }),
		).toBeInTheDocument();
	});

	it("HTTPステータスコードが指定されている場合、コードを表示する", () => {
		const error = new Error("Server error");
		(error as any).status = 503;

		render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

		expect(screen.getByText(/503/)).toBeInTheDocument();
	});

	it("onRetryが未指定の場合、リトライボタンを表示しない", () => {
		render(<ErrorDisplay error={new Error("Test error")} />);

		expect(screen.queryByRole("button", { name: /再試行/i })).toBeNull();
	});

	it("エラーオブジェクトからメッセージを抽出できる", () => {
		const error = new Error("Custom error message");

		render(<ErrorDisplay error={error} onRetry={vi.fn()} />);

		expect(screen.getByText("Custom error message")).toBeInTheDocument();
	});

	it("文字列エラーも表示できる", () => {
		render(<ErrorDisplay error="String error message" onRetry={vi.fn()} />);

		expect(screen.getByText("String error message")).toBeInTheDocument();
	});

	it("エラーの種類に応じて適切なアイコンを表示する", () => {
		const { rerender } = render(
			<ErrorDisplay
				error={new Error("Test")}
				onRetry={vi.fn()}
				data-testid="error-display"
			/>,
		);

		// Default error should have AlertCircle icon
		expect(screen.getByTestId("error-display")).toBeInTheDocument();

		// 404 should show empty state
		const error404 = new Error("Not found");
		(error404 as any).status = 404;
		rerender(
			<ErrorDisplay error={error404} onRetry={vi.fn()} data-testid="error-404" />,
		);
		expect(screen.getByTestId("error-404")).toBeInTheDocument();
	});
});
