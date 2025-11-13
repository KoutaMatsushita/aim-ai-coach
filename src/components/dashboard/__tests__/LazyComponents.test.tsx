import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";

// Mock the actual components before importing lazy versions
vi.mock("../AnalysisDialog", () => ({
	AnalysisDialog: ({ analysis }: any) => (
		<div data-testid="analysis-dialog">AnalysisDialog: {analysis.id}</div>
	),
}));

vi.mock("../PlaylistDialog", () => ({
	PlaylistDialog: ({ playlist }: any) => (
		<div data-testid="playlist-dialog">PlaylistDialog: {playlist.id}</div>
	),
}));

vi.mock("../ChatModal", () => ({
	ChatModal: ({ userId }: any) => (
		<div data-testid="chat-modal">ChatModal: {userId}</div>
	),
}));

describe("Lazy Loaded Components", () => {
	it("AnalysisDialog遅延ロード中はSuspenseフォールバックを表示する", async () => {
		// Dynamic import to test lazy loading
		const { LazyAnalysisDialog } = await import("../LazyComponents");

		const mockAnalysis = {
			id: "test-analysis",
			trend: "improving" as const,
			strengths: [],
			challenges: [],
			milestones: [],
			nextRecommendations: [],
			chartData: { labels: [], datasets: [] },
		};

		render(
			<Suspense fallback={<div data-testid="loading">Loading...</div>}>
				<LazyAnalysisDialog
					analysis={mockAnalysis}
					open={true}
					onOpenChange={() => {}}
				/>
			</Suspense>,
		);

		// Initially should show loading
		expect(screen.queryByTestId("loading")).toBeInTheDocument();

		// After load, should show the actual component
		await waitFor(() => {
			expect(screen.getByTestId("analysis-dialog")).toBeInTheDocument();
		});
	});

	it("PlaylistDialog遅延ロード中はSuspenseフォールバックを表示する", async () => {
		const { LazyPlaylistDialog } = await import("../LazyComponents");

		const mockPlaylist = {
			id: "test-playlist",
			title: "Test Playlist",
			description: "Test",
			targetWeaknesses: [],
			scenarios: [],
			reasoning: "Test reasoning",
		};

		render(
			<Suspense fallback={<div data-testid="loading">Loading...</div>}>
				<LazyPlaylistDialog
					playlist={mockPlaylist}
					open={true}
					onOpenChange={() => {}}
				/>
			</Suspense>,
		);

		expect(screen.queryByTestId("loading")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByTestId("playlist-dialog")).toBeInTheDocument();
		});
	});

	it("ChatModal遅延ロード中はSuspenseフォールバックを表示する", async () => {
		const { LazyChatModal } = await import("../LazyComponents");

		render(
			<Suspense fallback={<div data-testid="loading">Loading...</div>}>
				<LazyChatModal userId="test-user" />
			</Suspense>,
		);

		expect(screen.queryByTestId("loading")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
		});
	});

	it("LazyComponentsは全てReact.lazyでラップされている", async () => {
		const { LazyAnalysisDialog, LazyPlaylistDialog, LazyChatModal } =
			await import("../LazyComponents");

		// React.lazy returns a special component type
		expect(LazyAnalysisDialog).toBeDefined();
		expect(LazyPlaylistDialog).toBeDefined();
		expect(LazyChatModal).toBeDefined();

		// Check if they have the lazy component signature
		expect(typeof LazyAnalysisDialog).toBe("object");
		expect(typeof LazyPlaylistDialog).toBe("object");
		expect(typeof LazyChatModal).toBe("object");
	});
});
