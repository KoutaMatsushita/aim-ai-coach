import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all the components
vi.mock("@/components/dashboard/CoachingContextProvider", () => ({
	CoachingContextProvider: ({
		children,
		userId,
	}: {
		children: React.ReactNode;
		userId: string;
	}) => (
		<div data-testid="coaching-context-provider" data-userid={userId}>
			{children}
		</div>
	),
	useCoachingContext: () => ({
		userId: "test-user",
		userContext: "active_user",
		isLoading: false,
		isError: false,
	}),
}));

vi.mock("@/components/dashboard/CoachingStatusCard", () => ({
	CoachingStatusCard: ({ userId }: { userId: string }) => (
		<div data-testid="coaching-status-card">Status Card for {userId}</div>
	),
}));

vi.mock("@/components/dashboard/DailyReportCard", () => ({
	DailyReportCard: ({ userId }: { userId: string }) => (
		<div data-testid="daily-report-card">Daily Report for {userId}</div>
	),
}));

vi.mock("@/components/dashboard/ScoreAnalysisCard", () => ({
	ScoreAnalysisCard: ({ userId }: { userId: string }) => (
		<div data-testid="score-analysis-card">Score Analysis for {userId}</div>
	),
}));

vi.mock("@/components/dashboard/PlaylistGeneratorCard", () => ({
	PlaylistGeneratorCard: ({ userId }: { userId: string }) => (
		<div data-testid="playlist-generator-card">
			Playlist Generator for {userId}
		</div>
	),
}));

vi.mock("@/components/dashboard/ProgressReviewCard", () => ({
	ProgressReviewCard: ({
		userId,
		userContext,
	}: {
		userId: string;
		userContext: string;
	}) => (
		<div data-testid="progress-review-card">
			Progress Review for {userId} ({userContext})
		</div>
	),
}));

vi.mock("@/components/dashboard/ChatModal", () => ({
	ChatModal: ({ userId }: { userId: string }) => (
		<div data-testid="chat-modal">Chat Modal for {userId}</div>
	),
}));

// Import the route component after mocks
import { Route } from "../index";

describe("DashboardPage", () => {
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

	it("すべてのカードコンポーネントを表示する", () => {
		const Component = Route.options.component as React.ComponentType;

		// Mock AuthLayout to provide user
		vi.mock("@/components/layout/auth", () => ({
			AuthLayout: ({
				children,
			}: {
				children: (user: any) => React.ReactNode;
			}) => children({ id: "test-user", name: "Test User" }),
		}));

		renderWithProvider(<Component />);

		expect(screen.getByTestId("coaching-status-card")).toBeInTheDocument();
		expect(screen.getByTestId("daily-report-card")).toBeInTheDocument();
		expect(screen.getByTestId("score-analysis-card")).toBeInTheDocument();
		expect(screen.getByTestId("playlist-generator-card")).toBeInTheDocument();
	});

	it("ChatModalを表示する", () => {
		const Component = Route.options.component as React.ComponentType;

		vi.mock("@/components/layout/auth", () => ({
			AuthLayout: ({
				children,
			}: {
				children: (user: any) => React.ReactNode;
			}) => children({ id: "test-user", name: "Test User" }),
		}));

		renderWithProvider(<Component />);

		expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
	});

	it("CoachingContextProviderでページ全体をラップする", () => {
		const Component = Route.options.component as React.ComponentType;

		vi.mock("@/components/layout/auth", () => ({
			AuthLayout: ({
				children,
			}: {
				children: (user: any) => React.ReactNode;
			}) => children({ id: "test-user", name: "Test User" }),
		}));

		renderWithProvider(<Component />);

		expect(screen.getByTestId("coaching-context-provider")).toBeInTheDocument();
		expect(screen.getByTestId("coaching-context-provider")).toHaveAttribute(
			"data-userid",
			"test-user",
		);
	});
});
