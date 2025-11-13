import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
	DialogSkeleton,
	ChatModalSkeleton,
} from "../SuspenseFallback";

describe("Suspense Fallback Components", () => {
	describe("DialogSkeleton", () => {
		it("Skeletonコンポーネントを表示する", () => {
			render(<DialogSkeleton />);

			// Skeleton should be rendered
			const skeletons = screen.getAllByTestId("dialog-skeleton");
			expect(skeletons.length).toBeGreaterThan(0);
		});

		it("適切なスタイルでレンダリングされる", () => {
			const { container } = render(<DialogSkeleton />);

			// Should have appropriate structure
			expect(container.firstChild).toBeInTheDocument();
		});
	});

	describe("ChatModalSkeleton", () => {
		it("チャットモーダル用のSkeletonを表示する", () => {
			render(<ChatModalSkeleton />);

			const skeleton = screen.getByTestId("chat-modal-skeleton");
			expect(skeleton).toBeInTheDocument();
		});

		it("適切なスタイルでレンダリングされる", () => {
			const { container } = render(<ChatModalSkeleton />);

			expect(container.firstChild).toBeInTheDocument();
		});
	});
});
