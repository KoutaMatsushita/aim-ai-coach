import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaylistDialog } from "../PlaylistDialog";
import type { Playlist } from "../../../../api/langgraph/types";

describe("PlaylistDialog", () => {
	const mockPlaylist: Playlist = {
		id: "playlist-1",
		userId: "test-user",
		title: "トラッキング改善プレイリスト",
		description: "トラッキング精度を向上させる練習プラン",
		scenarios: [
			{
				scenarioName: "1w6ts reload small",
				platform: "kovaaks",
				purpose: "トラッキング精度向上",
				expectedEffect: "小さい目標への追従性が改善される",
				duration: 15,
				order: 1,
				difficultyLevel: "intermediate",
			},
			{
				scenarioName: "Close Long Strafes Invincible",
				platform: "kovaaks",
				purpose: "中距離トラッキング",
				expectedEffect: "実戦での追従力が強化される",
				duration: 20,
				order: 2,
				difficultyLevel: "advanced",
			},
		],
		targetWeaknesses: ["tracking", "small target accuracy"],
		totalDuration: 35,
		reasoning: "スコア分析の結果、トラッキング精度に課題があることが判明したため",
		createdAt: new Date("2025-01-10"),
		isActive: true,
	};

	it("プレイリストタイトルを表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("トラッキング改善プレイリスト")).toBeInTheDocument();
	});

	it("プレイリスト説明を表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("トラッキング精度を向上させる練習プラン")).toBeInTheDocument();
	});

	it("対象弱点を表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText(/tracking/i)).toBeInTheDocument();
		expect(screen.getByText(/small target accuracy/i)).toBeInTheDocument();
	});

	it("総所要時間を表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText(/35/)).toBeInTheDocument();
	});

	it("シナリオリストを順序付きで表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("1w6ts reload small")).toBeInTheDocument();
		expect(screen.getByText("Close Long Strafes Invincible")).toBeInTheDocument();
	});

	it("各シナリオの目的と期待効果を表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("トラッキング精度向上")).toBeInTheDocument();
		expect(screen.getByText("小さい目標への追従性が改善される")).toBeInTheDocument();
	});

	it("推論理由を表示する", () => {
		render(
			<PlaylistDialog
				playlist={mockPlaylist}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByText(/スコア分析の結果、トラッキング精度に課題があることが判明したため/i),
		).toBeInTheDocument();
	});
});
