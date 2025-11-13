import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ScoreAnalysis } from "../../../../api/langgraph/types";
import { AnalysisDialog } from "../AnalysisDialog";

describe("AnalysisDialog", () => {
	const mockAnalysis: ScoreAnalysis = {
		userId: "test-user",
		period: {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-10"),
		},
		trend: "improving",
		strengths: ["精密なトラッキング", "高速反応"],
		challenges: ["オーバーシュート傾向", "長距離精度"],
		milestones: ["1000スコア達成", "10日連続練習"],
		chartData: {
			labels: ["Day 1", "Day 2", "Day 3"],
			datasets: [
				{
					label: "Score",
					data: [800, 850, 900],
				},
			],
		},
		createdAt: new Date("2025-01-10"),
	};

	it("トレンドアイコンとテキストを表示する", () => {
		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText(/improving/i)).toBeInTheDocument();
	});

	it("強みリストを表示する", () => {
		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("精密なトラッキング")).toBeInTheDocument();
		expect(screen.getByText("高速反応")).toBeInTheDocument();
	});

	it("弱点リストを表示する", () => {
		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("オーバーシュート傾向")).toBeInTheDocument();
		expect(screen.getByText("長距離精度")).toBeInTheDocument();
	});

	it("マイルストーンを表示する", () => {
		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("1000スコア達成")).toBeInTheDocument();
		expect(screen.getByText("10日連続練習")).toBeInTheDocument();
	});

	it("プレイリスト生成ボタンを表示する", () => {
		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /プレイリスト生成/i }),
		).toBeInTheDocument();
	});

	it("chartDataが存在する場合はチャートコンポーネントを表示する", () => {
		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		// Tremorチャートコンポーネントがレンダリングされることを確認
		// (実際のチャートは別のテストでカバー)
		expect(screen.getByText(/Day 1/i)).toBeInTheDocument();
	});

	it("ダイアログを閉じることができる", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();

		render(
			<AnalysisDialog
				analysis={mockAnalysis}
				open={true}
				onOpenChange={onOpenChange}
			/>,
		);

		// Radix UI Dialogの閉じるボタンをクリック
		const closeButton = screen.getByRole("button", { name: /close/i });
		await user.click(closeButton);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
