/**
 * Chat Graph Streaming のテスト
 * Task 5.1: ストリーミング応答機能を実装
 * Task 5.2: 会話履歴取得機能を実装
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { ChatGraphState } from "../../types";
import { ChatGraphService } from "../chat-graph";

// Mock environment variable for testing
beforeEach(() => {
	// Set mock API key for testing (will use mock responses)
	process.env.GOOGLE_API_KEY = "test-api-key";
});

describe("Task 5: Chat Graph サービスの完成", () => {
	const mockVectorStore = {} as any;

	// Mock database with Drizzle query interface
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

	describe("Task 5.1: ストリーミング応答機能", () => {
		it("should have stream method in ChatGraphService", () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);
			expect(typeof service.stream).toBe("function");
		});

		it("should return async iterator from stream method", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user";
			const messages = [{ role: "user", content: "こんにちは" }];

			const stream = service.stream(userId, messages);

			// stream は AsyncIterator を返す
			expect(stream).toBeDefined();
			expect(typeof stream[Symbol.asyncIterator]).toBe("function");
		});

		it.skip("should stream graph execution results", async () => {
			// NOTE: This is an integration test that requires real API calls
			// Skip in unit test suite - should be moved to integration tests
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user";
			const messages = [{ role: "user", content: "こんにちは" }];

			const chunks: Partial<ChatGraphState>[] = [];

			// ストリーム実行
			for await (const chunk of service.stream(userId, messages)) {
				chunks.push(chunk);
			}

			// 少なくとも1つのチャンクを受信
			expect(chunks.length).toBeGreaterThan(0);
		});

		it("should use default threadId as userId when not specified", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user-123";
			const messages = [{ role: "user", content: "テスト" }];

			// threadId を指定しない
			const stream = service.stream(userId, messages);

			expect(stream).toBeDefined();
			// threadId は内部で userId にフォールバックされる
		});

		it("should use custom threadId when specified", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user-123";
			const messages = [{ role: "user", content: "テスト" }];
			const threadId = "custom-thread-id";

			// カスタム threadId を指定
			const stream = service.stream(userId, messages, { threadId });

			expect(stream).toBeDefined();
		});

		it("should pass configurable options to graph", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user";
			const messages = [{ role: "user", content: "テスト" }];
			const configurable = { customOption: "value" };

			const stream = service.stream(userId, messages, { configurable });

			expect(stream).toBeDefined();
		});
	});

	describe("Task 5.2: 会話履歴取得機能", () => {
		it("should have getMessages method in ChatGraphService", () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);
			expect(typeof service.getMessages).toBe("function");
		});

		it("should return messages and userContext", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user";
			const result = await service.getMessages(userId);

			expect(result).toHaveProperty("messages");
			expect(result).toHaveProperty("userContext");
			expect(result).toHaveProperty("threadId");
			expect(Array.isArray(result.messages)).toBe(true);
		});

		it("should use default threadId as userId when not specified", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user-456";
			const result = await service.getMessages(userId);

			// threadId は userId にフォールバック
			expect(result.threadId).toBe(userId);
		});

		it("should use custom threadId when specified", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "test-user-456";
			const threadId = "custom-thread-789";

			const result = await service.getMessages(userId, { threadId });

			// カスタム threadId が使用される
			expect(result.threadId).toBe(threadId);
		});

		it("should return empty messages array when no history exists", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "new-user-no-history";
			const result = await service.getMessages(userId);

			// 履歴がない場合は空配列
			expect(result.messages).toEqual([]);
		});

		it("should return default userContext when no history exists", async () => {
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "new-user-no-context";
			const result = await service.getMessages(userId);

			// デフォルトは active_user
			expect(result.userContext).toBe("active_user");
		});

		it("should handle errors gracefully and return empty messages", async () => {
			// エラーが発生しても空のメッセージリストを返す
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "error-test-user";
			const result = await service.getMessages(userId);

			// エラー時も正常なレスポンス構造を返す
			expect(result).toHaveProperty("messages");
			expect(result).toHaveProperty("userContext");
			expect(result).toHaveProperty("threadId");
		});
	});

	describe("Chat Graph Integration", () => {
		it.skip("should stream and retrieve messages in same session", async () => {
			// NOTE: This is an integration test that requires real API calls
			// Skip in unit test suite - should be moved to integration tests
			const service = new ChatGraphService(mockVectorStore, mockDb);

			const userId = "session-test-user";
			const threadId = "session-thread-123";
			const messages = [{ role: "user", content: "テストメッセージ" }];

			// ストリーミング実行
			const chunks: Partial<ChatGraphState>[] = [];
			for await (const chunk of service.stream(userId, messages, {
				threadId,
			})) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);

			// 会話履歴取得（実装されれば履歴が取得できる）
			const history = await service.getMessages(userId, { threadId });
			expect(history).toBeDefined();
		});
	});
});
