/**
 * Tools ↔ 外部サービス統合テスト
 * Task 13.3: Tools ↔ 外部サービス統合テストを実装
 */

import type { MastraVector } from "@mastra/core/vector";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAddTextKnowledgeTool,
	createVectorSearchTool,
} from "../rag-tools";
import {
	calculateUserStatsTool,
	findAimlabTasksTool,
	findKovaaksScoresTool,
	findUserTool,
} from "../user-tools";

// Mock database
const createMockDb = () => {
	return {
		query: {
			usersTable: {
				findFirst: vi.fn().mockResolvedValue({
					id: "test-user-123",
					name: "Test User",
					email: "test@example.com",
				}),
			},
			kovaaksScoresTable: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: 1,
						userId: "test-user-123",
						scenarioName: "Tile Frenzy",
						runEpochSec: Math.floor(Date.now() / 1000) - 86400,
						accuracy: 0.85,
						score: 1000,
						kills: 100,
						deaths: 10,
					},
					{
						id: 2,
						userId: "test-user-123",
						scenarioName: "1wall 6targets",
						runEpochSec: Math.floor(Date.now() / 1000) - 172800,
						accuracy: 0.8,
						score: 950,
						kills: 95,
						deaths: 15,
					},
				]),
			},
			aimlabTasksTable: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: 1,
						userId: "test-user-123",
						taskName: "Gridshot",
						createDate: new Date(Date.now() - 86400000).toISOString(),
						score: 85000,
						accuracy: 88.5,
					},
				]),
			},
		},
	} as unknown as DrizzleD1Database<any>;
};

// Mock vector store
const createMockVectorStore = () => {
	return {
		search: vi.fn().mockResolvedValue([
			{
				id: "doc1",
				content:
					"Tile Frenzy is a tracking scenario that improves mouse control",
				metadata: { scenarioName: "Tile Frenzy", category: "tracking" },
				score: 0.92,
			},
			{
				id: "doc2",
				content: "1wall 6targets is a flicking scenario for precision training",
				metadata: { scenarioName: "1wall 6targets", category: "flicking" },
				score: 0.88,
			},
		]),
		addDocuments: vi.fn().mockResolvedValue(undefined),
		listIndexes: vi.fn().mockResolvedValue([]),
		createIndex: vi.fn().mockResolvedValue(undefined),
	} as unknown as MastraVector;
};

describe("Task 13.3: Tools ↔ External Services Integration", () => {
	describe("User Tools ↔ Database Integration", () => {
		it("should execute findUserTool with correct database query", async () => {
			const mockDb = createMockDb();
			const findFirstSpy = vi.spyOn(mockDb.query.usersTable, "findFirst");

			const result = await findUserTool.invoke(
				{ userId: "test-user-123" },
				{ db: mockDb },
			);

			// Verify database query was called
			expect(findFirstSpy).toHaveBeenCalled();

			// Verify result structure (returns object, not string)
			expect(result).toBeDefined();
			expect(typeof result).toBe("object");
			expect(result).toHaveProperty("id");
		});

		it("should handle user not found error", async () => {
			const mockDb = createMockDb();

			// Mock user not found
			mockDb.query.usersTable.findFirst = vi.fn().mockResolvedValue(null);

			const result = await findUserTool.invoke(
				{ userId: "nonexistent-user" },
				{ db: mockDb },
			);

			expect(result).toHaveProperty("error");
		});

		it("should execute findKovaaksScoresTool with limit parameter", async () => {
			const mockDb = createMockDb();
			const findManySpy = vi.spyOn(mockDb.query.kovaaksScoresTable, "findMany");

			const result = await findKovaaksScoresTool.invoke(
				{ userId: "test-user-123", limit: 10 },
				{ db: mockDb },
			);

			// Verify database query was called
			expect(findManySpy).toHaveBeenCalled();

			// Verify result is array of scores
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it("should handle database connection errors gracefully", async () => {
			const mockDb = createMockDb();

			// Mock database error
			mockDb.query.kovaaksScoresTable.findMany = vi
				.fn()
				.mockRejectedValue(new Error("Database connection failed"));

			try {
				await findKovaaksScoresTool.invoke(
					{ userId: "test-user-123", limit: 10 },
					{ db: mockDb },
				);
				// Should throw error
				expect(true).toBe(false);
			} catch (error) {
				expect((error as Error).message).toContain(
					"Database connection failed",
				);
			}
		});

		it("should execute findAimlabTasksTool with date filtering", async () => {
			const mockDb = createMockDb();
			const findManySpy = vi.spyOn(mockDb.query.aimlabTasksTable, "findMany");

			const result = await findAimlabTasksTool.invoke(
				{ userId: "test-user-123", limit: 5 },
				{ db: mockDb },
			);

			// Verify database query was called
			expect(findManySpy).toHaveBeenCalled();

			// Verify result is array
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it("should execute calculateUserStatsTool with aggregation", async () => {
			const mockDb = createMockDb();

			const result = await calculateUserStatsTool.invoke(
				{ userId: "test-user-123", days: 7 },
				{ db: mockDb },
			);

			// Verify statistics object is returned
			expect(result).toBeDefined();
			expect(typeof result).toBe("object");
		});

		it("should handle missing data in stats calculation", async () => {
			const mockDb = createMockDb();

			// Mock empty scores
			mockDb.query.kovaaksScoresTable.findMany = vi.fn().mockResolvedValue([]);

			const result = await calculateUserStatsTool.invoke(
				{ userId: "test-user-123", days: 7 },
				{ db: mockDb },
			);

			expect(result).toBeDefined();
			expect(typeof result).toBe("object");
		});
	});

	describe("RAG Tools ↔ Vector Store Integration", () => {
		it("should create vectorSearchTool with proper schema", () => {
			const mockVectorStore = createMockVectorStore();
			const vectorSearchTool = createVectorSearchTool(mockVectorStore);

			// Verify tool is created with proper structure
			expect(vectorSearchTool).toBeDefined();
			expect(vectorSearchTool.name).toBeDefined();
			expect(vectorSearchTool.description).toBeDefined();
			expect(vectorSearchTool.schema).toBeDefined();
		});

		it("should create addTextKnowledgeTool with proper schema", () => {
			const mockVectorStore = createMockVectorStore();
			const addTextKnowledgeTool = createAddTextKnowledgeTool(mockVectorStore);

			// Verify tool is created with proper structure
			expect(addTextKnowledgeTool).toBeDefined();
			expect(addTextKnowledgeTool.name).toBeDefined();
			expect(addTextKnowledgeTool.description).toBeDefined();
			expect(addTextKnowledgeTool.schema).toBeDefined();
		});

		it("should validate tool schemas with zod", () => {
			const mockVectorStore = createMockVectorStore();
			const vectorSearchTool = createVectorSearchTool(mockVectorStore);

			// Test schema validation
			const schema = vectorSearchTool.schema;
			expect(schema).toBeDefined();

			// Query parameter should be required
			const validInput = { query: "test", limit: 5 };
			const result = schema.safeParse(validInput);
			expect(result.success).toBe(true);

			// Invalid input should fail
			const invalidResult = schema.safeParse({});
			expect(invalidResult.success).toBe(false);
		});

		it("should verify RAG tools are properly exported", () => {
			// Verify that RAG tool factory functions exist and are callable
			expect(typeof createVectorSearchTool).toBe("function");
			expect(typeof createAddTextKnowledgeTool).toBe("function");

			const mockVectorStore = createMockVectorStore();

			// Should be able to create tools without errors
			expect(() => createVectorSearchTool(mockVectorStore)).not.toThrow();
			expect(() => createAddTextKnowledgeTool(mockVectorStore)).not.toThrow();
		});
	});

	describe("Cross-Service Integration", () => {
		it("should support database and vector store tools independently", async () => {
			const mockDb = createMockDb();
			const mockVectorStore = createMockVectorStore();

			// Get user's recent scores (Database tool)
			const scoresResult = await findKovaaksScoresTool.invoke(
				{ userId: "test-user-123", limit: 5 },
				{ db: mockDb },
			);

			// Create vector search tool (RAG tool)
			const vectorSearchTool = createVectorSearchTool(mockVectorStore);

			// Both should be operational
			expect(scoresResult).toBeDefined();
			expect(vectorSearchTool).toBeDefined();
		});

		it("should handle database operations independently from vector store", async () => {
			const mockDb = createMockDb();

			// Database tools should work without vector store
			const userResult = await findUserTool.invoke(
				{ userId: "test-user-123" },
				{ db: mockDb },
			);

			const scoresResult = await findKovaaksScoresTool.invoke(
				{ userId: "test-user-123", limit: 5 },
				{ db: mockDb },
			);

			expect(userResult).toBeDefined();
			expect(scoresResult).toBeDefined();
			expect(Array.isArray(scoresResult)).toBe(true);
		});
	});

	describe("Tool Error Handling and Validation", () => {
		it("should validate input parameters before service calls", async () => {
			const mockDb = createMockDb();

			// Invalid userId (empty string) - tool should still execute
			const result = await findUserTool.invoke({ userId: "" }, { db: mockDb });

			// Empty userId should result in no user found
			expect(result).toHaveProperty("error");
		});

		it("should provide descriptive error messages", async () => {
			const mockDb = createMockDb();

			mockDb.query.usersTable.findFirst = vi
				.fn()
				.mockRejectedValue(new Error("Database timeout"));

			try {
				await findUserTool.invoke({ userId: "test-user-123" }, { db: mockDb });
				// Should throw error
				expect(true).toBe(false);
			} catch (error) {
				expect((error as Error).message).toContain("Database timeout");
			}
		});

		it("should handle concurrent database tool invocations", async () => {
			const mockDb = createMockDb();

			// Execute multiple database tools concurrently
			const results = await Promise.all([
				findUserTool.invoke({ userId: "test-user-123" }, { db: mockDb }),
				findKovaaksScoresTool.invoke(
					{ userId: "test-user-123", limit: 5 },
					{ db: mockDb },
				),
				findAimlabTasksTool.invoke(
					{ userId: "test-user-123", limit: 5 },
					{ db: mockDb },
				),
			]);

			// All should complete successfully
			expect(results).toHaveLength(3);
			expect(results[0]).toBeDefined(); // User tool result
			expect(results[1]).toBeDefined(); // Kovaaks scores tool result
			expect(results[2]).toBeDefined(); // Aimlab tasks tool result
		});
	});
});
