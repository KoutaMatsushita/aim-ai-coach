/**
 * Model Factory のテスト
 * Task 2.2: Model Factory を実装
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModel } from "../model-factory";

// Google Gemini のモックを作成
vi.mock("@langchain/google-genai", () => ({
	ChatGoogleGenerativeAI: vi.fn(),
}));

describe("Task 2.2: Model Factory", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		vi.clearAllMocks();

		// ChatGoogleGenerativeAI のモックがインスタンスを返すように設定
		const mockInstance = { invoke: vi.fn() };
		(ChatGoogleGenerativeAI as any).mockReturnValue(mockInstance);
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	describe("createModel 関数", () => {
		it("should return gemini-2.5-flash for chat task type", () => {
			const model = createModel("chat");

			// ChatGoogleGenerativeAI が正しいパラメータで呼び出されたことを確認
			expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
				model: "gemini-2.5-flash",
				temperature: 0.7,
			});

			// モデルインスタンスが返されることを確認
			expect(model).toBeDefined();
		});

		it("should return gemini-2.5-pro for task task type", () => {
			const model = createModel("task");

			// ChatGoogleGenerativeAI が正しいパラメータで呼び出されたことを確認
			expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith({
				model: "gemini-2.5-pro",
				temperature: 0.7,
			});

			// モデルインスタンスが返されることを確認
			expect(model).toBeDefined();
		});

		it("should log model selection reason for chat type", () => {
			createModel("chat");

			// ログが正しく出力されたことを確認
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Model Selection]"),
				expect.objectContaining({
					taskType: "chat",
					model: "gemini-2.5-flash",
					reason: expect.any(String),
				}),
			);
		});

		it("should log model selection reason for task type", () => {
			createModel("task");

			// ログが正しく出力されたことを確認
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Model Selection]"),
				expect.objectContaining({
					taskType: "task",
					model: "gemini-2.5-pro",
					reason: expect.any(String),
				}),
			);
		});

		it("should use temperature 0.7 for both models", () => {
			// Chat モデル
			createModel("chat");
			expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.7,
				}),
			);

			vi.clearAllMocks();

			// Task モデル
			createModel("task");
			expect(ChatGoogleGenerativeAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.7,
				}),
			);
		});

		it("should return ChatGoogleGenerativeAI instance", () => {
			const mockInstance = { invoke: vi.fn() };
			(ChatGoogleGenerativeAI as any).mockReturnValue(mockInstance);

			const chatModel = createModel("chat");
			const taskModel = createModel("task");

			// 両方のモデルが同じ型のインスタンスを返すことを確認
			expect(chatModel).toBe(mockInstance);
			expect(taskModel).toBe(mockInstance);
		});

		it("should explain model selection reason in logs", () => {
			// Chat モデルのログ
			createModel("chat");
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Model Selection]",
				expect.objectContaining({
					reason: expect.stringContaining("軽量"),
				}),
			);

			consoleLogSpy.mockClear();

			// Task モデルのログ
			createModel("task");
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Model Selection]",
				expect.objectContaining({
					reason: expect.stringContaining("複雑"),
				}),
			);
		});
	});

	describe("モデル選択戦略", () => {
		it("should use flash model for lightweight chat operations", () => {
			// Chat Graph は軽量な会話処理に使用
			createModel("chat");

			const calls = (ChatGoogleGenerativeAI as any).mock.calls;
			const lastCall = calls[calls.length - 1][0];

			expect(lastCall.model).toBe("gemini-2.5-flash");
		});

		it("should use pro model for complex task operations", () => {
			// Task Graph は複雑な分析タスクに使用
			createModel("task");

			const calls = (ChatGoogleGenerativeAI as any).mock.calls;
			const lastCall = calls[calls.length - 1][0];

			expect(lastCall.model).toBe("gemini-2.5-pro");
		});

		it("should optimize cost by using flash for chat", () => {
			// コスト最適化: Chat は Flash モデルを使用
			createModel("chat");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Model Selection]",
				expect.objectContaining({
					taskType: "chat",
					model: "gemini-2.5-flash",
				}),
			);
		});

		it("should prioritize quality by using pro for task", () => {
			// 品質優先: Task は Pro モデルを使用
			createModel("task");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Model Selection]",
				expect.objectContaining({
					taskType: "task",
					model: "gemini-2.5-pro",
				}),
			);
		});
	});

	describe("型安全性", () => {
		it("should only accept chat or task as taskType", () => {
			// TypeScript の型チェックにより、"chat" | "task" 以外は受け付けない
			// この test は型レベルの検証なので、実行時エラーは発生しない

			const chatModel = createModel("chat");
			const taskModel = createModel("task");

			expect(chatModel).toBeDefined();
			expect(taskModel).toBeDefined();

			// 以下はコンパイル時にエラーになる（TypeScript strict mode）
			// const invalidModel = createModel("invalid");
		});
	});
});
