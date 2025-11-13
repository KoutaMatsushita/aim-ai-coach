/**
 * Chat Mode E2E Tests
 * Task 14.1: Chat Mode E2E テストを実装
 */

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Variables } from "../../variables";
import { chatApp } from "../chat";

// Mock user
const mockUser = {
	id: "test-user-123",
	name: "Test User",
	email: "test@example.com",
};

// Mock LangGraph
const mockMessages: any[] = [];
const mockLangGraph = {
	stream: vi.fn().mockImplementation(async function* (
		userId: string,
		messages: any[],
		options?: any,
	) {
		// Simulate context detection node
		yield {
			detectContext: {
				userContext: "active_user",
			},
		};

		// Simulate chat agent node with message
		yield {
			chatAgent: {
				messages: [
					{
						role: "assistant",
						content: "こんにちは！今日のトレーニングはどうでしたか？",
					},
				],
				userContext: "active_user",
			},
		};
	}),
	getMessages: vi.fn().mockResolvedValue({
		threadId: "test-user-123",
		messages: [
			{
				role: "user",
				content: "こんにちは",
			},
			{
				role: "assistant",
				content: "こんにちは！今日のトレーニングはどうでしたか？",
			},
		],
		userContext: "active_user",
	}),
};

describe("Task 14.1: Chat Mode E2E Tests", () => {
	let app: Hono<{ Variables: Variables }>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockMessages.length = 0;

		// Create test app with middleware
		app = new Hono<{ Variables: Variables }>();

		// Setup mock middleware
		app.use("*", async (c, next) => {
			c.set("user", mockUser);
			c.set("langGraph", mockLangGraph as any);
			await next();
		});

		// Mount chat routes
		app.route("/", chatApp);
	});

	describe("User Message Send → Chat Graph → Streaming Response → History Save", () => {
		it("should send user message and receive streaming response", async () => {
			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-1",
					messages: [
						{
							id: "msg-1",
							role: "user",
							content: "こんにちは",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("text/event-stream");

			// Read SSE stream
			const text = await res.text();

			// Should contain SSE messages
			expect(text).toContain("data:");

			// Verify stream was called with correct parameters
			expect(mockLangGraph.stream).toHaveBeenCalledWith(
				mockUser.id,
				expect.arrayContaining([
					expect.objectContaining({
						role: "user",
						content: "こんにちは",
					}),
				]),
				expect.objectContaining({
					threadId: mockUser.id,
				}),
			);
		});

		it("should handle chat messages with proper context", async () => {
			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-2",
					messages: [
						{
							id: "msg-2",
							role: "user",
							content: "プレイリストを作成してください",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			expect(res.status).toBe(200);

			// Verify Chat Graph was invoked
			expect(mockLangGraph.stream).toHaveBeenCalled();
		});

		it("should stream multiple chunks from Chat Graph execution", async () => {
			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-3",
					messages: [
						{
							id: "msg-3",
							role: "user",
							content: "こんにちは",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			const text = await res.text();

			// Should have multiple SSE events
			const events = text.split("\n\n").filter((e) => e.startsWith("data:"));
			expect(events.length).toBeGreaterThan(0);
		});
	});

	describe("Intent Detection → Task Graph Delegation → Task Execution → Result Return", () => {
		it("should detect intent and delegate to Task Graph", async () => {
			// Mock Task Graph delegation
			mockLangGraph.stream = vi.fn().mockImplementation(async function* () {
				// Context detection
				yield {
					detectContext: {
						userContext: "active_user",
					},
				};

				// Intent detection → Task delegation
				yield {
					chatAgent: {
						messages: [
							{
								role: "assistant",
								content: "プレイリストを作成しました！",
							},
						],
						userContext: "active_user",
					},
				};
			});

			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-4",
					messages: [
						{
							id: "msg-4",
							role: "user",
							content: "プレイリストを作成してください",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			expect(res.status).toBe(200);

			const text = await res.text();
			expect(text).toContain("data:");

			// Verify stream was called
			expect(mockLangGraph.stream).toHaveBeenCalled();
		});

		it("should return task execution results in streaming response", async () => {
			mockLangGraph.stream = vi.fn().mockImplementation(async function* () {
				yield {
					chatAgent: {
						messages: [
							{
								role: "assistant",
								content: "スコア分析が完了しました。",
							},
						],
					},
				};
			});

			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-5",
					messages: [
						{
							id: "msg-5",
							role: "user",
							content: "スコアを分析してください",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			expect(res.status).toBe(200);

			const text = await res.text();
			expect(text).toBeDefined();
		});
	});

	describe("Chat History Retrieval → Accurate History Return", () => {
		it("should retrieve chat history successfully", async () => {
			const res = await app.request("/messages", {
				method: "GET",
			});

			expect(res.status).toBe(200);

			const body = await res.json();

			expect(body).toHaveProperty("messages");
			expect(Array.isArray(body.messages)).toBe(true);
			expect(body.messages.length).toBeGreaterThan(0);

			// Verify getMessages was called with user ID
			expect(mockLangGraph.getMessages).toHaveBeenCalledWith(
				mockUser.id,
				expect.objectContaining({
					threadId: mockUser.id,
				}),
			);
		});

		it("should return messages in correct format", async () => {
			const res = await app.request("/messages", {
				method: "GET",
			});

			const body = await res.json();

			// Verify message structure
			expect(body.messages).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						role: expect.stringMatching(/user|assistant/),
						content: expect.any(String),
					}),
				]),
			);
		});

		it("should include user context in history response", async () => {
			mockLangGraph.getMessages = vi.fn().mockResolvedValue({
				threadId: "test-user-123",
				messages: [
					{
						role: "user",
						content: "こんにちは",
					},
					{
						role: "assistant",
						content: "こんにちは！",
					},
				],
				userContext: "active_user",
			});

			const res = await app.request("/messages", {
				method: "GET",
			});

			const body = await res.json();

			expect(body).toHaveProperty("messages");
			expect(body).toHaveProperty("userContext");
		});
	});

	describe("Error Handling", () => {
		it("should handle Chat Graph stream errors during execution", async () => {
			// Note: Errors thrown during SSE streaming cannot change HTTP status code
			// as headers are already sent. This test verifies the stream handles errors
			// gracefully without crashing.
			mockLangGraph.stream = vi.fn().mockImplementation(async function* () {
				yield {
					detectContext: {
						userContext: "active_user",
					},
				};
				// Error during stream execution - would be logged but not crash
				throw new Error("Chat Graph stream error");
			});

			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-6",
					messages: [
						{
							id: "msg-6",
							role: "user",
							content: "こんにちは",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			// SSE stream returns 200 even if errors occur during streaming
			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("text/event-stream");
		});

		it("should validate required message field", async () => {
			const res = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-7",
					messages: [],
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should handle history retrieval errors", async () => {
			mockLangGraph.getMessages = vi
				.fn()
				.mockRejectedValue(new Error("History error"));

			const res = await app.request("/messages", {
				method: "GET",
			});

			expect(res.status).toBe(500);

			const body = await res.json();
			expect(body).toHaveProperty("error");
		});
	});

	describe("Complete E2E Flow", () => {
		it("should complete full conversation flow: send → stream → history", async () => {
			// Reset mocks for clean E2E test
			mockLangGraph.stream = vi.fn().mockImplementation(async function* () {
				yield {
					detectContext: {
						userContext: "active_user",
					},
				};
				yield {
					chatAgent: {
						messages: [
							{
								role: "assistant",
								content: "こんにちは！今日のトレーニングはどうでしたか？",
							},
						],
						userContext: "active_user",
					},
				};
			});

			mockLangGraph.getMessages = vi.fn().mockResolvedValue({
				threadId: "test-user-123",
				messages: [
					{
						role: "user",
						content: "こんにちは",
					},
					{
						role: "assistant",
						content: "こんにちは！今日のトレーニングはどうでしたか？",
					},
				],
				userContext: "active_user",
			});

			// Step 1: Send message
			const sendRes = await app.request("/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: "thread-8",
					messages: [
						{
							id: "msg-8",
							role: "user",
							content: "こんにちは",
							metadata: { createdAt: new Date().toISOString() },
						},
					],
				}),
			});

			expect(sendRes.status).toBe(200);

			// Step 2: Retrieve history
			const historyRes = await app.request("/messages", {
				method: "GET",
			});

			expect(historyRes.status).toBe(200);

			const history = await historyRes.json();
			expect(history.messages).toBeDefined();
			expect(Array.isArray(history.messages)).toBe(true);
		});
	});
});
