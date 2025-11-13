/**
 * RAG Tools のテスト
 * Task 2.4: RAG Tools を実装
 *
 * 注意: RAG Tools は RAGLibSQL クラスに依存しているため、
 * 統合テストではなく、構造と API 検証に焦点を当てる
 */

import { describe, expect, it } from "vitest";
import {
	createAddTextKnowledgeTool,
	createAddYoutubeContentTool,
	createPersonalizedRecommendationTool,
	createVectorSearchTool,
} from "../rag-tools";

describe("Task 2.4: RAG Tools", () => {
	// RAG Tools はファクトリー関数なので、モックインスタンスで作成
	const mockVector = {
		query: () => Promise.resolve([]),
		upsert: () => Promise.resolve(),
		initializeIndex: () => Promise.resolve(),
	} as any;

	describe("createVectorSearchTool", () => {
		it("should create tool with correct name and description", () => {
			const tool = createVectorSearchTool(mockVector);

			expect(tool.name).toBe("vector_search");
			expect(tool.description).toBeDefined();
			expect(tool.description.length).toBeGreaterThan(0);
		});

		it("should have correct schema with query and limit fields", () => {
			const tool = createVectorSearchTool(mockVector);
			const schema = tool.schema;

			// 有効なデータ
			const validData = { query: "test query", limit: 5 };
			const validResult = schema.safeParse(validData);
			expect(validResult.success).toBe(true);

			// limit なしでもOK
			const noLimitData = { query: "test query" };
			const noLimitResult = schema.safeParse(noLimitData);
			expect(noLimitResult.success).toBe(true);
		});

		it("should reject invalid input without query", () => {
			const tool = createVectorSearchTool(mockVector);
			const schema = tool.schema;

			const result = schema.safeParse({ limit: 5 });
			expect(result.success).toBe(false);
		});

		it("should have invoke method", () => {
			const tool = createVectorSearchTool(mockVector);
			expect(typeof tool.invoke).toBe("function");
		});
	});

	describe("createAddYoutubeContentTool", () => {
		it("should create tool with correct name and description", () => {
			const tool = createAddYoutubeContentTool(mockVector);

			expect(tool.name).toBe("add_youtube_content");
			expect(tool.description).toBeDefined();
			expect(tool.description.length).toBeGreaterThan(0);
		});

		it("should have correct schema with videoUrl field", () => {
			const tool = createAddYoutubeContentTool(mockVector);
			const schema = tool.schema;

			const validData = { videoUrl: "https://www.youtube.com/watch?v=test" };
			const result = schema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid input without videoUrl", () => {
			const tool = createAddYoutubeContentTool(mockVector);
			const schema = tool.schema;

			const result = schema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("should have invoke method", () => {
			const tool = createAddYoutubeContentTool(mockVector);
			expect(typeof tool.invoke).toBe("function");
		});
	});

	describe("createAddTextKnowledgeTool", () => {
		it("should create tool with correct name and description", () => {
			const tool = createAddTextKnowledgeTool(mockVector);

			expect(tool.name).toBe("add_text_knowledge");
			expect(tool.description).toBeDefined();
			expect(tool.description.length).toBeGreaterThan(0);
		});

		it("should have correct schema with title and content fields", () => {
			const tool = createAddTextKnowledgeTool(mockVector);
			const schema = tool.schema;

			const validData = {
				title: "Test Title",
				content: "Test content",
			};
			const result = schema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid input without required fields", () => {
			const tool = createAddTextKnowledgeTool(mockVector);
			const schema = tool.schema;

			// title なし
			const noTitle = schema.safeParse({ content: "test" });
			expect(noTitle.success).toBe(false);

			// content なし
			const noContent = schema.safeParse({ title: "test" });
			expect(noContent.success).toBe(false);
		});

		it("should have invoke method", () => {
			const tool = createAddTextKnowledgeTool(mockVector);
			expect(typeof tool.invoke).toBe("function");
		});
	});

	describe("createPersonalizedRecommendationTool", () => {
		it("should create tool with correct name and description", () => {
			const tool = createPersonalizedRecommendationTool(mockVector);

			expect(tool.name).toBe("get_personalized_recommendations");
			expect(tool.description).toBeDefined();
			expect(tool.description.length).toBeGreaterThan(0);
		});

		it("should have correct schema with required fields", () => {
			const tool = createPersonalizedRecommendationTool(mockVector);
			const schema = tool.schema;

			const validData = {
				userId: "test-user",
				skillLevel: "intermediate",
				weakAreas: ["tracking", "flicking"],
			};
			const result = schema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid input without required fields", () => {
			const tool = createPersonalizedRecommendationTool(mockVector);
			const schema = tool.schema;

			// userId なし
			const noUserId = schema.safeParse({
				skillLevel: "intermediate",
				weakAreas: ["tracking"],
			});
			expect(noUserId.success).toBe(false);

			// weakAreas なし
			const noWeakAreas = schema.safeParse({
				userId: "test-user",
				skillLevel: "intermediate",
			});
			expect(noWeakAreas.success).toBe(false);
		});

		it("should have invoke method", () => {
			const tool = createPersonalizedRecommendationTool(mockVector);
			expect(typeof tool.invoke).toBe("function");
		});
	});

	describe("Tool Integration", () => {
		it("should all factory functions return valid tools", () => {
			const tools = [
				createVectorSearchTool(mockVector),
				createAddYoutubeContentTool(mockVector),
				createAddTextKnowledgeTool(mockVector),
				createPersonalizedRecommendationTool(mockVector),
			];

			for (const tool of tools) {
				expect(tool.name).toBeDefined();
				expect(tool.description).toBeDefined();
				expect(tool.schema).toBeDefined();
				expect(typeof tool.invoke).toBe("function");
			}
		});

		it("should all tools have unique names", () => {
			const tools = [
				createVectorSearchTool(mockVector),
				createAddYoutubeContentTool(mockVector),
				createAddTextKnowledgeTool(mockVector),
				createPersonalizedRecommendationTool(mockVector),
			];

			const names = tools.map((t) => t.name);
			const uniqueNames = new Set(names);

			expect(uniqueNames.size).toBe(tools.length);
		});

		it("should all tools have descriptions", () => {
			const tools = [
				createVectorSearchTool(mockVector),
				createAddYoutubeContentTool(mockVector),
				createAddTextKnowledgeTool(mockVector),
				createPersonalizedRecommendationTool(mockVector),
			];

			for (const tool of tools) {
				expect(tool.description.length).toBeGreaterThan(0);
			}
		});

		it("should all tools have valid Zod schemas", () => {
			const tools = [
				createVectorSearchTool(mockVector),
				createAddYoutubeContentTool(mockVector),
				createAddTextKnowledgeTool(mockVector),
				createPersonalizedRecommendationTool(mockVector),
			];

			for (const tool of tools) {
				expect(typeof tool.schema.safeParse).toBe("function");
			}
		});

		it("should accept correct dependencies", () => {
			// Vector store が必要なツール
			const vectorSearchTool = createVectorSearchTool(mockVector);
			const addYoutubeTool = createAddYoutubeContentTool(mockVector);
			const addTextTool = createAddTextKnowledgeTool(mockVector);
			const recommendationTool =
				createPersonalizedRecommendationTool(mockVector);

			expect(vectorSearchTool).toBeDefined();
			expect(addYoutubeTool).toBeDefined();
			expect(addTextTool).toBeDefined();
			expect(recommendationTool).toBeDefined();
		});

		it("should tools follow consistent naming convention", () => {
			const tools = [
				createVectorSearchTool(mockVector),
				createAddYoutubeContentTool(mockVector),
				createAddTextKnowledgeTool(mockVector),
				createPersonalizedRecommendationTool(mockVector),
			];

			for (const tool of tools) {
				// すべてのツール名はスネークケースであるべき
				expect(tool.name).toMatch(/^[a-z_]+$/);
			}
		});

		it("should all schemas use Zod", () => {
			const tools = [
				createVectorSearchTool(mockVector),
				createAddYoutubeContentTool(mockVector),
				createAddTextKnowledgeTool(mockVector),
				createPersonalizedRecommendationTool(mockVector),
			];

			for (const tool of tools) {
				// Zod schema は safeParse メソッドを持つ
				expect(tool.schema).toHaveProperty("safeParse");
				expect(typeof tool.schema.safeParse).toBe("function");
			}
		});
	});
});
