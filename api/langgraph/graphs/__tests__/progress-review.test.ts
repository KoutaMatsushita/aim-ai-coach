/**
 * Progress Review Node のテスト
 * Task 7.3: Progress Review ノードの実装
 */

import { beforeEach, describe, expect, it } from "vitest";
import { TaskGraphService } from "../task-graph";

beforeEach(() => {
	process.env.GOOGLE_API_KEY = "test-api-key";
});

describe("Task 7.3: Progress Review Node", () => {
	const mockVectorStore = {} as any;

	const mockDb = {
		query: {
			kovaaksScoresTable: {
				findMany: async () => [
					{
						runEpochSec: Math.floor(Date.now() / 1000) - 7 * 86400, // 7 days ago
					},
				],
			},
			aimlabTaskTable: {
				findMany: async () => [],
			},
		},
	} as any;

	describe("Basic Functionality", () => {
		it("should return review with required fields", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(result.taskResult).toBeDefined();
			expect(result.taskResult?.type).toBe("review");
			expect(result.taskResult?.data).toHaveProperty("userId");
			expect(result.taskResult?.data).toHaveProperty("reviewPeriod");
			expect(result.taskResult?.data).toHaveProperty("daysInactive");
			expect(result.taskResult?.data).toHaveProperty("progressSummary");
		});

		it("should include userId in review data", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user-789",
				taskType: "progress_review",
			});

			expect(result.taskResult?.data.userId).toBe("test-user-789");
		});
	});

	describe("Inactivity Tracking", () => {
		it("should calculate days inactive", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(typeof result.taskResult?.data.daysInactive).toBe("number");
			expect(result.taskResult?.data.daysInactive).toBeGreaterThanOrEqual(0);
		});

		it("should handle users with no activity", async () => {
			const emptyDb = {
				query: {
					kovaaksScoresTable: {
						findMany: async () => [],
					},
					aimlabTaskTable: {
						findMany: async () => [],
					},
				},
			} as any;

			const service = new TaskGraphService(mockVectorStore, emptyDb);

			const result = await service.invoke({
				userId: "new-user",
				taskType: "progress_review",
			});

			// Should handle gracefully, either with high days inactive or 0
			expect(typeof result.taskResult?.data.daysInactive).toBe("number");
		});
	});

	describe("Review Content", () => {
		it("should include progress summary", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(typeof result.taskResult?.data.progressSummary).toBe("string");
			expect(result.taskResult?.data.progressSummary.length).toBeGreaterThan(0);
		});

		it("should include review period", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(typeof result.taskResult?.data.reviewPeriod).toBe("string");
		});

		it("should include content message", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(result.taskResult?.content).toBeDefined();
			expect(result.taskResult?.content).toContain("進捗レビュー");
		});
	});

	describe("Achievements and Goals", () => {
		it("should include achievements array", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(Array.isArray(result.taskResult?.data.achievements)).toBe(true);
		});

		it("should include areas for improvement", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(Array.isArray(result.taskResult?.data.areasForImprovement)).toBe(
				true,
			);
		});

		it("should include next goals", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(Array.isArray(result.taskResult?.data.nextGoals)).toBe(true);
		});
	});

	describe("Database Integration", () => {
		it("should query user activity from database", async () => {
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
				taskType: "progress_review",
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
				taskType: "progress_review",
			});

			expect(result.metadata.status).toBe("failure");
			expect(result.metadata.errorMessage).toBeDefined();
		});
	});
});
