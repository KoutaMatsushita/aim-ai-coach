/**
 * Score Analysis Node のテスト
 * Task 7.2: Score Analysis ノードの実装
 */

import { beforeEach, describe, expect, it } from "vitest";
import { TaskGraphService } from "../task-graph";

beforeEach(() => {
	process.env.GOOGLE_API_KEY = "test-api-key";
});

describe("Task 7.2: Score Analysis Node", () => {
	const mockVectorStore = {} as any;

	const mockDb = {
		query: {
			kovaaksScoresTable: {
				findMany: async () => [
					{
						scenarioName: "Tile Frenzy",
						scoreValue: 85.5,
						accuracy: 0.75,
						runEpochSec: Math.floor(Date.now() / 1000) - 86400,
					},
					{
						scenarioName: "1wall 6targets",
						scoreValue: 88.2,
						accuracy: 0.78,
						runEpochSec: Math.floor(Date.now() / 1000) - 172800,
					},
				],
			},
			aimlabTaskTable: {
				findMany: async () => [],
			},
		},
	} as any;

	describe("Basic Functionality", () => {
		it("should return analysis with required fields", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(result.taskResult).toBeDefined();
			expect(result.taskResult?.type).toBe("analysis");
			expect(result.taskResult?.data).toHaveProperty("userId");
			expect(result.taskResult?.data).toHaveProperty("period");
			expect(result.taskResult?.data).toHaveProperty("trend");
			expect(result.taskResult?.data).toHaveProperty("strengths");
			expect(result.taskResult?.data).toHaveProperty("weaknesses");
		});

		it("should include userId in analysis data", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user-456",
				taskType: "score_analysis",
			});

			expect(result.taskResult?.data.userId).toBe("test-user-456");
		});
	});

	describe("Performance Trend", () => {
		it("should have valid trend value", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			const validTrends = ["improving", "stable", "declining"];
			expect(validTrends).toContain(result.taskResult?.data.trend);
		});
	});

	describe("Strengths and Weaknesses", () => {
		it("should include strengths array", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(Array.isArray(result.taskResult?.data.strengths)).toBe(true);
		});

		it("should include weaknesses array", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(Array.isArray(result.taskResult?.data.weaknesses)).toBe(true);
		});
	});

	describe("Analysis Metadata", () => {
		it("should include period information", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(typeof result.taskResult?.data.period).toBe("string");
		});

		it("should include totalSessions count", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(typeof result.taskResult?.data.totalSessions).toBe("number");
			expect(result.taskResult?.data.totalSessions).toBeGreaterThanOrEqual(0);
		});

		it("should include content message", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(result.taskResult?.content).toBeDefined();
			expect(result.taskResult?.content).toContain("スコア分析");
		});
	});

	describe("Database Integration", () => {
		it("should query kovaaks scores from database", async () => {
			let queryCalled = false;
			const testDb = {
				query: {
					kovaaksScoresTable: {
						findMany: async () => {
							queryCalled = true;
							return [];
						},
					},
					aimlabTaskTable: {
						findMany: async () => [],
					},
				},
			} as any;

			const service = new TaskGraphService(mockVectorStore, testDb);

			await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(queryCalled).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors", async () => {
			const failingDb = {
				query: {
					kovaaksScoresTable: {
						findMany: async () => {
							throw new Error("Database error");
						},
					},
					aimlabTaskTable: {
						findMany: async () => [],
					},
				},
			} as any;

			const service = new TaskGraphService(mockVectorStore, failingDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(result.metadata.status).toBe("failure");
			expect(result.metadata.errorMessage).toBeDefined();
		});
	});
});
