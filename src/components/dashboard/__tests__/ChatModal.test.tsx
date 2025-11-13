import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatModal } from "../ChatModal";

// Mock AimAssistant component
vi.mock("../../AimAssistant", () => ({
	AimAssistant: ({ userId }: { userId: string }) => (
		<div data-testid="aim-assistant">AimAssistant for {userId}</div>
	),
}));

describe("ChatModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("チャットアイコンボタンを表示する", () => {
		render(<ChatModal userId="test-user" />);

		expect(
			screen.getByRole("button", { name: /チャット/i }),
		).toBeInTheDocument();
	});

	it("ボタンクリックでモーダルを開く", async () => {
		const user = userEvent.setup();

		render(<ChatModal userId="test-user" />);

		const button = screen.getByRole("button", { name: /チャット/i });
		await user.click(button);

		// モーダルが開いてAimAssistantが表示される
		expect(screen.getByTestId("aim-assistant")).toBeInTheDocument();
		expect(screen.getByText(/AimAssistant for test-user/i)).toBeInTheDocument();
	});

	it("モーダルを閉じることができる", async () => {
		const user = userEvent.setup();

		render(<ChatModal userId="test-user" />);

		// モーダルを開く
		const openButton = screen.getByRole("button", { name: /チャット/i });
		await user.click(openButton);

		expect(screen.getByTestId("aim-assistant")).toBeInTheDocument();

		// モーダルを閉じる（Radix UI Dialogの閉じるボタン）
		const closeButton = screen.getByRole("button", { name: /close/i });
		await user.click(closeButton);

		// モーダルが閉じてAimAssistantが非表示になる
		expect(screen.queryByTestId("aim-assistant")).not.toBeInTheDocument();
	});

	it("固定位置にボタンが配置される", () => {
		const { container } = render(<ChatModal userId="test-user" />);

		const button = container.querySelector('button[style*="position: fixed"]');
		expect(button).toBeInTheDocument();
	});
});
