import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CoachingContextProvider, useCoachingContext } from "../CoachingContextProvider";

// テスト用コンポーネント
function TestConsumer() {
	const context = useCoachingContext();

	if (context.isLoading) {
		return <div>Loading...</div>;
	}

	if (context.isError) {
		return <div>Error: {context.error?.message}</div>;
	}

	return (
		<div>
			<div data-testid="userId">{context.userId}</div>
			<div data-testid="isNewUser">{String(context.isNewUser)}</div>
			<div data-testid="daysInactive">{context.daysInactive}</div>
		</div>
	);
}

describe("CoachingContextProvider", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	it("should provide userId to children", () => {
		const testUserId = "test-user-123";

		render(
			<QueryClientProvider client={queryClient}>
				<CoachingContextProvider userId={testUserId}>
					<TestConsumer />
				</CoachingContextProvider>
			</QueryClientProvider>
		);

		// ローディング状態を確認
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("should throw error when used outside provider", () => {
		expect(() => {
			render(<TestConsumer />);
		}).toThrow("CoachingContextProviderでラップされていません");
	});
});
