/**
 * Intent Detection のテスト
 * Task 4.1: インテント検出ロジックを実装
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntentDetectionResult } from "../intent-detection";
import { detectIntent } from "../intent-detection";

// Mock environment variable for testing
beforeEach(() => {
	// Set mock API key for testing (will use mock responses)
	process.env.GOOGLE_API_KEY = "test-api-key";
});

describe("Task 4.1: インテント検出ロジック", () => {
	describe("detectIntent", () => {
		it("should detect task_execution intent for playlist building", async () => {
			const message = "プレイリスト作って";
			const result = await detectIntent(message);

			expect(result.intent).toBe("task_execution");
			expect(result.taskType).toBe("playlist_building");
			expect(result.confidence).toBeGreaterThanOrEqual(0.7);
		});

		it("should detect task_execution intent for score analysis", async () => {
			const message = "今日のスコアを分析して";
			const result = await detectIntent(message);

			expect(result.intent).toBe("task_execution");
			expect(result.taskType).toBe("score_analysis");
			expect(result.confidence).toBeGreaterThanOrEqual(0.7);
		});

		it("should detect task_execution intent for daily report", async () => {
			const message = "今日の振り返りレポート生成して";
			const result = await detectIntent(message);

			expect(result.intent).toBe("task_execution");
			expect(result.taskType).toBe("daily_report");
			expect(result.confidence).toBeGreaterThanOrEqual(0.7);
		});

		it("should detect task_execution intent for progress review", async () => {
			const message = "進捗確認したい";
			const result = await detectIntent(message);

			expect(result.intent).toBe("task_execution");
			expect(result.taskType).toBe("progress_review");
			expect(result.confidence).toBeGreaterThanOrEqual(0.7);
		});

		it("should detect information_request intent", async () => {
			const message = "プレイリストって何？";
			const result = await detectIntent(message);

			expect(result.intent).toBe("information_request");
			expect(result.taskType).toBeNull();
		});

		it("should detect general_conversation intent", async () => {
			const message = "こんにちは";
			const result = await detectIntent(message);

			expect(result.intent).toBe("general_conversation");
			expect(result.taskType).toBeNull();
		});

		it("should return low confidence for ambiguous messages", async () => {
			const message = "うーん";
			const result = await detectIntent(message);

			expect(result.confidence).toBeLessThan(0.7);
		});

		it("should have correct IntentDetectionResult structure", async () => {
			const message = "プレイリスト作成";
			const result = await detectIntent(message);

			expect(result).toHaveProperty("intent");
			expect(result).toHaveProperty("taskType");
			expect(result).toHaveProperty("confidence");
			expect(typeof result.confidence).toBe("number");
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);
		});
	});

	describe("Intent Detection Edge Cases", () => {
		it("should handle empty message", async () => {
			const message = "";
			const result = await detectIntent(message);

			expect(result.intent).toBe("general_conversation");
			expect(result.confidence).toBeLessThan(0.7);
		});

		it("should handle very long message", async () => {
			const message = "プレイリスト作って ".repeat(100);
			const result = await detectIntent(message);

			expect(result.intent).toBe("task_execution");
			expect(result.taskType).toBe("playlist_building");
		});

		it("should handle mixed intent message", async () => {
			const message = "プレイリストって何？作成してほしい";
			const result = await detectIntent(message);

			// Either task_execution or information_request is acceptable
			expect(["task_execution", "information_request"]).toContain(
				result.intent,
			);
		});
	});
});
