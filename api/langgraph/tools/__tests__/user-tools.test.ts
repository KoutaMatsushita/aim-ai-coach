/**
 * User Tools のテスト
 * Task 2.3: User Tools を実装
 *
 * 注意: 実際のDB に依存するため、構造とスキーマの検証に焦点を当てる
 */

import { describe, expect, it } from "vitest";
import {
	calculateUserStatsTool,
	findAimlabTasksTool,
	findKovaaksScoresTool,
	findUserTool,
} from "../user-tools";

describe("Task 2.3: User Tools", () => {
	describe("findUserTool", () => {
		it("should have correct name and description", () => {
			expect(findUserTool.name).toBe("find_user");
			expect(findUserTool.description).toContain("Find user");
		});

		it("should have correct schema with userId field", () => {
			const schema = findUserTool.schema;
			expect(schema).toBeDefined();

			const testData = { userId: "test-user-123" };
			const result = schema.safeParse(testData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid input without userId", () => {
			const schema = findUserTool.schema;
			const result = schema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("should have invoke method", () => {
			expect(typeof findUserTool.invoke).toBe("function");
		});
	});

	describe("findKovaaksScoresTool", () => {
		it("should have correct name and description", () => {
			expect(findKovaaksScoresTool.name).toBe("find_kovaaks_scores");
			expect(findKovaaksScoresTool.description).toContain("Kovaaks");
		});

		it("should have correct schema with userId and limit fields", () => {
			const schema = findKovaaksScoresTool.schema;

			const validData = { userId: "test-user", limit: 10 };
			const validResult = schema.safeParse(validData);
			expect(validResult.success).toBe(true);

			const noLimitData = { userId: "test-user" };
			const noLimitResult = schema.safeParse(noLimitData);
			expect(noLimitResult.success).toBe(true);
		});

		it("should have optional filter parameters", () => {
			const schema = findKovaaksScoresTool.schema;

			const withFilters = {
				userId: "test-user",
				limit: 5,
				offset: 10,
				days: 7,
				scenarioName: "Test Scenario",
				orderBy: "accuracy",
				sortOrder: "asc",
			};

			const result = schema.safeParse(withFilters);
			expect(result.success).toBe(true);
		});

		it("should have invoke method", () => {
			expect(typeof findKovaaksScoresTool.invoke).toBe("function");
		});
	});

	describe("findAimlabTasksTool", () => {
		it("should have correct name and description", () => {
			expect(findAimlabTasksTool.name).toBe("find_aimlab_tasks");
			expect(findAimlabTasksTool.description).toContain("Aimlab");
		});

		it("should have correct schema with userId and limit fields", () => {
			const schema = findAimlabTasksTool.schema;

			const validData = { userId: "test-user", limit: 10 };
			const result = schema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should have optional filter parameters", () => {
			const schema = findAimlabTasksTool.schema;

			const withFilters = {
				userId: "test-user",
				limit: 5,
				offset: 10,
				days: 7,
				taskName: "Test Task",
				minScore: 1000,
				maxScore: 5000,
				orderBy: "score",
				sortOrder: "asc",
			};

			const result = schema.safeParse(withFilters);
			expect(result.success).toBe(true);
		});

		it("should have invoke method", () => {
			expect(typeof findAimlabTasksTool.invoke).toBe("function");
		});
	});

	describe("calculateUserStatsTool", () => {
		it("should have correct name and description", () => {
			expect(calculateUserStatsTool.name).toBe("calculate_user_stats");
			expect(calculateUserStatsTool.description).toContain("Calculate");
		});

		it("should have correct schema with userId, days, and platform fields", () => {
			const schema = calculateUserStatsTool.schema;

			// Kovaaks platform
			const kovaaksData = {
				userId: "test-user",
				days: 30,
				platform: "kovaaks",
			};
			const kovaaksResult = schema.safeParse(kovaaksData);
			expect(kovaaksResult.success).toBe(true);

			// Aimlab platform
			const aimlabData = {
				userId: "test-user",
				days: 30,
				platform: "aimlab",
			};
			const aimlabResult = schema.safeParse(aimlabData);
			expect(aimlabResult.success).toBe(true);

			// days is optional (has default)
			const noDaysData = { userId: "test-user", platform: "kovaaks" };
			const noDaysResult = schema.safeParse(noDaysData);
			expect(noDaysResult.success).toBe(true);
		});

		it("should require platform field", () => {
			const schema = calculateUserStatsTool.schema;

			const noPlatform = { userId: "test-user", days: 30 };
			const result = schema.safeParse(noPlatform);
			expect(result.success).toBe(false);
		});

		it("should reject invalid platform value", () => {
			const schema = calculateUserStatsTool.schema;

			const invalidPlatform = {
				userId: "test-user",
				platform: "invalid",
			};
			const result = schema.safeParse(invalidPlatform);
			expect(result.success).toBe(false);
		});

		it("should have invoke method", () => {
			expect(typeof calculateUserStatsTool.invoke).toBe("function");
		});
	});

	describe("Tool Integration", () => {
		it("should all tools have unique names", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			const names = tools.map((t) => t.name);
			const uniqueNames = new Set(names);

			expect(uniqueNames.size).toBe(tools.length);
		});

		it("should all tools have descriptions", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			for (const tool of tools) {
				expect(tool.description).toBeDefined();
				expect(tool.description.length).toBeGreaterThan(0);
			}
		});

		it("should all tools have valid schemas", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			for (const tool of tools) {
				expect(tool.schema).toBeDefined();
				expect(typeof tool.schema.safeParse).toBe("function");
			}
		});

		it("should all tools have invoke method", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			for (const tool of tools) {
				expect(typeof tool.invoke).toBe("function");
			}
		});

		it("should all tools follow consistent naming convention", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			for (const tool of tools) {
				// すべてのツール名はスネークケースであるべき
				expect(tool.name).toMatch(/^[a-z_]+$/);
			}
		});

		it("should all schemas use Zod", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			for (const tool of tools) {
				// Zod schema は safeParse メソッドを持つ
				expect(tool.schema).toHaveProperty("safeParse");
				expect(typeof tool.schema.safeParse).toBe("function");
			}
		});

		it("should tools expose LangChain Tool interface", () => {
			const tools = [
				findUserTool,
				findKovaaksScoresTool,
				findAimlabTasksTool,
				calculateUserStatsTool,
			];

			for (const tool of tools) {
				// LangChain Tool インターフェースの必須プロパティ
				expect(tool).toHaveProperty("name");
				expect(tool).toHaveProperty("description");
				expect(tool).toHaveProperty("schema");
				expect(tool).toHaveProperty("invoke");
			}
		});
	});
});
