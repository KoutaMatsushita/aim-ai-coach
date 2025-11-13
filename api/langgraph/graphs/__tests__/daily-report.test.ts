/**
 * Daily Report Node のテスト
 * Task 7.4: Daily Report ノードの実装
 */

import { beforeEach, describe, expect, it } from "vitest";
import { TaskGraphService } from "../task-graph";

beforeEach(() => {
	process.env.GOOGLE_API_KEY = "test-api-key";
});

describe("Task 7.4: Daily Report Node", () => {
	const mockVectorStore = {} as any;

	const mockDb = {
		query: {
			kovaaksScoresTable: {
				findMany: async () => [
					{
						scenarioName: "Tile Frenzy",
						scoreValue: 85.5,
						runEpochSec: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
					},
					{
						scenarioName: "1wall 6targets",
						scoreValue: 88.2,
						runEpochSec: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
					},
				],
			},
			aimlabTaskTable: {
				findMany: async () => [],
			},
		},
	} as any;

	describe("Basic Functionality", () => {
		it("should return report with required fields", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(result.taskResult).toBeDefined();
			expect(result.taskResult?.type).toBe("report");
			expect(result.taskResult?.data).toHaveProperty("userId");
			expect(result.taskResult?.data).toHaveProperty("date");
			expect(result.taskResult?.data).toHaveProperty("sessionsToday");
			expect(result.taskResult?.data).toHaveProperty("totalPracticeTime");
		});

		it("should include userId in report data", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user-daily",
				taskType: "daily_report",
			});

			expect(result.taskResult?.data.userId).toBe("test-user-daily");
		});
	});

	describe("Session Statistics", () => {
		it("should count sessions today", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(typeof result.taskResult?.data.sessionsToday).toBe("number");
			expect(result.taskResult?.data.sessionsToday).toBeGreaterThanOrEqual(0);
		});

		it("should calculate total practice time", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(typeof result.taskResult?.data.totalPracticeTime).toBe("number");
			expect(result.taskResult?.data.totalPracticeTime).toBeGreaterThanOrEqual(
				0,
			);
		});

		it("should handle users with no sessions today", async () => {
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
				userId: "inactive-user",
				taskType: "daily_report",
			});

			expect(result.taskResult?.data.sessionsToday).toBe(0);
		});
	});

	describe("Report Content", () => {
		it("should include date", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(result.taskResult?.data.date).toBeInstanceOf(Date);
		});

		it("should include achievements array", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(Array.isArray(result.taskResult?.data.achievements)).toBe(true);
		});

		it("should include performance rating", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(typeof result.taskResult?.data.performance).toBe("string");
		});

		it("should include tomorrow goals", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(Array.isArray(result.taskResult?.data.tomorrowGoals)).toBe(true);
		});

		it("should include content message", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(result.taskResult?.content).toBeDefined();
			expect(result.taskResult?.content).toContain("デイリーレポート");
		});
	});

	describe("Motivational Content", () => {
		it("should include motivational message", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(typeof result.taskResult?.data.motivationalMessage).toBe("string");
			expect(
				result.taskResult?.data.motivationalMessage.length,
			).toBeGreaterThan(0);
		});
	});

	describe("Database Integration", () => {
		it("should query today's scores from database", async () => {
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
				taskType: "daily_report",
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
				taskType: "daily_report",
			});

			expect(result.metadata.status).toBe("failure");
			expect(result.metadata.errorMessage).toBeDefined();
		});
	});
});
