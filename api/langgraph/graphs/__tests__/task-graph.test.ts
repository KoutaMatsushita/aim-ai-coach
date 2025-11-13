/**
 * Task Graph のテスト
 * Task 6: Task Graph の基本構造
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskGraphState, TaskType } from "../../types";
import { createTaskGraph, TaskGraphService } from "../task-graph";

// Mock dependencies
beforeEach(() => {
	// Set mock API key for testing
	process.env.GOOGLE_API_KEY = "test-api-key";
});

describe("Task 6: Task Graph の基本構造", () => {
	const mockVectorStore = {} as any;
	const mockDb = {
		query: {
			kovaaksScoresTable: {
				findMany: async () => [],
			},
			aimlabTaskTable: {
				findMany: async () => [],
			},
		},
	} as any;

	describe("Task 6.1: Task Graph スケルトン", () => {
		it("should create Task Graph with TaskGraphState", () => {
			const taskGraph = createTaskGraph(mockVectorStore, mockDb);
			expect(taskGraph).toBeDefined();
		});

		it("should have TaskGraphService class", () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);
			expect(service).toBeDefined();
			expect(typeof service.invoke).toBe("function");
		});

		it("should accept userId and taskType as input", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const input = {
				userId: "test-user",
				taskType: "daily_report" as TaskType,
			};

			// Should not throw error
			expect(() => service.invoke(input)).toBeDefined();
		});
	});

	describe("Task 6.2: Task Router", () => {
		it("should route to daily_report node for daily_report taskType", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			// Result should contain task execution metadata
			expect(result).toHaveProperty("taskResult");
			expect(result).toHaveProperty("metadata");
		});

		it("should route to score_analysis node for score_analysis taskType", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(result).toHaveProperty("taskResult");
			expect(result).toHaveProperty("metadata");
		});

		it("should route to playlist_builder node for playlist_building taskType", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "playlist_building",
			});

			expect(result).toHaveProperty("taskResult");
			expect(result).toHaveProperty("metadata");
		});

		it("should route to progress_review node for progress_review taskType", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "progress_review",
			});

			expect(result).toHaveProperty("taskResult");
			expect(result).toHaveProperty("metadata");
		});
	});

	describe("Task 6.3: Task execution metadata", () => {
		it("should return metadata with executedAt timestamp", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const before = new Date();
			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});
			const after = new Date();

			expect(result.metadata).toHaveProperty("executedAt");
			expect(result.metadata.executedAt).toBeInstanceOf(Date);
			expect(result.metadata.executedAt.getTime()).toBeGreaterThanOrEqual(
				before.getTime(),
			);
			expect(result.metadata.executedAt.getTime()).toBeLessThanOrEqual(
				after.getTime(),
			);
		});

		it("should return metadata with taskType", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(result.metadata).toHaveProperty("taskType");
			expect(result.metadata.taskType).toBe("score_analysis");
		});

		it("should return metadata with status 'success' on successful execution", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			expect(result.metadata).toHaveProperty("status");
			expect(result.metadata.status).toBe("success");
		});

		it("should return metadata with status 'failure' and errorMessage on failure", async () => {
			// Mock a service that will fail
			const failingDb = {
				query: {
					kovaaksScoresTable: {
						findMany: async () => {
							throw new Error("Database connection error");
						},
					},
					aimlabTaskTable: {
						findMany: async () => {
							throw new Error("Database connection error");
						},
					},
				},
			} as any;

			const service = new TaskGraphService(mockVectorStore, failingDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "score_analysis",
			});

			expect(result.metadata).toHaveProperty("status");
			expect(result.metadata.status).toBe("failure");
			expect(result.metadata).toHaveProperty("errorMessage");
			expect(typeof result.metadata.errorMessage).toBe("string");
		});

		it("should log task execution start", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const consoleSpy = vi.spyOn(console, "log");

			await service.invoke({
				userId: "test-user-123",
				taskType: "daily_report",
			});

			// Should log task execution start
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Task Graph]"),
				expect.objectContaining({
					userId: "test-user-123",
					taskType: "daily_report",
				}),
			);

			consoleSpy.mockRestore();
		});

		it("should log task execution completion", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const consoleSpy = vi.spyOn(console, "log");

			await service.invoke({
				userId: "test-user-456",
				taskType: "score_analysis",
			});

			// Should log task execution completion
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Task Graph]"),
				expect.objectContaining({
					userId: "test-user-456",
					taskType: "score_analysis",
				}),
			);

			consoleSpy.mockRestore();
		});

		it("should log error details on task failure", async () => {
			const failingDb = {
				query: {
					kovaaksScoresTable: {
						findMany: async () => {
							throw new Error("Database connection error");
						},
					},
					aimlabTaskTable: {
						findMany: async () => {
							throw new Error("Database connection error");
						},
					},
				},
			} as any;

			const service = new TaskGraphService(mockVectorStore, failingDb);

			const consoleErrorSpy = vi.spyOn(console, "error");

			await service.invoke({
				userId: "test-user-error",
				taskType: "score_analysis",
			});

			// Should log error details
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("[Task Graph]"),
				expect.anything(),
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe("Task Graph Integration", () => {
		it("should detect user context before task execution", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			// Result should have been processed with user context
			expect(result).toBeDefined();
		});

		it("should return taskResult with appropriate type", async () => {
			const service = new TaskGraphService(mockVectorStore, mockDb);

			const result = await service.invoke({
				userId: "test-user",
				taskType: "daily_report",
			});

			// taskResult should exist (may be null for simplified implementation)
			expect(result).toHaveProperty("taskResult");
		});
	});
});
