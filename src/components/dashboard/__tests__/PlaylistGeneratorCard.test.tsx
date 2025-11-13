import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlaylistGeneratorCard } from "../PlaylistGeneratorCard";

// Mock usePlaylistGenerator hook
vi.mock("../hooks/usePlaylistGenerator", () => ({
	usePlaylistGenerator: vi.fn(),
}));

import { usePlaylistGenerator } from "../hooks/usePlaylistGenerator";

describe("PlaylistGeneratorCard", () => {
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

	it("プレイリスト生成フォームを表示する", () => {
		vi.mocked(usePlaylistGenerator).mockReturnValue({
			playlist: undefined,
			isLoading: false,
			isError: false,
			error: null,
			generatePlaylist: vi.fn(),
		});

		renderWithProvider(<PlaylistGeneratorCard userId="test-user" />);

		expect(screen.getByText(/プレイリスト生成/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/弱点エリア/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /生成/i })).toBeInTheDocument();
	});

	it("ローディング中はスピナーを表示する", () => {
		vi.mocked(usePlaylistGenerator).mockReturnValue({
			playlist: undefined,
			isLoading: true,
			isError: false,
			error: null,
			generatePlaylist: vi.fn(),
		});

		renderWithProvider(<PlaylistGeneratorCard userId="test-user" />);

		expect(screen.getByText(/生成中/i)).toBeInTheDocument();
	});

	it("エラー時はエラーメッセージとリトライボタンを表示する", () => {
		vi.mocked(usePlaylistGenerator).mockReturnValue({
			playlist: undefined,
			isLoading: false,
			isError: true,
			error: new Error("API error"),
			generatePlaylist: vi.fn(),
		});

		renderWithProvider(<PlaylistGeneratorCard userId="test-user" />);

		expect(screen.getByText(/エラーが発生しました/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /リトライ/i })).toBeInTheDocument();
	});

	it("フォーム送信でgeneratePlaylistを呼び出す", async () => {
		const user = userEvent.setup();
		const generatePlaylist = vi.fn();

		vi.mocked(usePlaylistGenerator).mockReturnValue({
			playlist: undefined,
			isLoading: false,
			isError: false,
			error: null,
			generatePlaylist,
		});

		renderWithProvider(<PlaylistGeneratorCard userId="test-user" />);

		const textarea = screen.getByPlaceholderText(/弱点エリア/i);
		await user.type(textarea, "tracking, flicking");

		const button = screen.getByRole("button", { name: /生成/i });
		await user.click(button);

		expect(generatePlaylist).toHaveBeenCalledWith({
			targetGame: undefined,
			weakAreas: ["tracking", "flicking"],
		});
	});

	it("weakAreasが空の場合はバリデーションエラーを表示する", async () => {
		const user = userEvent.setup();
		const generatePlaylist = vi.fn();

		vi.mocked(usePlaylistGenerator).mockReturnValue({
			playlist: undefined,
			isLoading: false,
			isError: false,
			error: null,
			generatePlaylist,
		});

		renderWithProvider(<PlaylistGeneratorCard userId="test-user" />);

		const button = screen.getByRole("button", { name: /生成/i });
		await user.click(button);

		expect(
			screen.getByText(/少なくとも1つの弱点エリアを入力してください/i),
		).toBeInTheDocument();
		expect(generatePlaylist).not.toHaveBeenCalled();
	});
});
