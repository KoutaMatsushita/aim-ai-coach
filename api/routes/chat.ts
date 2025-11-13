/**
 * LangGraph Chat Endpoint
 * Main chat interface powered by LangGraph coaching system
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { requireUser } from "../middleware/require-user";
import type { Variables } from "../variables";

export const chatApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post(
		"/",
		zValidator(
			"json",
			z.object({
				id: z.string(),
				messages: z.array(
					z.object({
						id: z.string(),
						role: z.string(),
						content: z.string().optional(),
						parts: z
							.array(
								z.object({
									type: z.string(),
									text: z.string().optional(),
								}),
							)
							.optional(),
						metadata: z
							.object({
								createdAt: z.string(),
							})
							.optional(),
					}),
				),
				trigger: z.string().optional(),
			}),
		),
		async (c) => {
			const currentUser = c.var.user;
			const { messages } = c.req.valid("json");

			const langGraph = c.var.langGraph;

			try {
				// Get the last user message from the request
				// The messages array from UI SDK contains all history,
				// but we only need the new message
				const lastUserMessage = messages.filter((m) => m.role === "user").pop();

				if (!lastUserMessage) {
					return c.json({ error: "No user message found" }, 400);
				}

				// Extract content from various possible formats
				let content = "";
				if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
					content = lastUserMessage.parts
						.map((part) => {
							if (part.type === "text" && part.text) return part.text;
							return "";
						})
						.join("");
				} else if (lastUserMessage.content) {
					content = lastUserMessage.content;
				}

				if (!content) {
					return c.json({ error: "Message content is empty" }, 400);
				}

				// Create simple message format for LangGraph
				const convertedMessages = [
					{
						role: "user",
						content,
					},
				];

				console.log(
					"[Chat Request] Original messages:",
					JSON.stringify(messages, null, 2),
				);
				console.log(
					"[Chat Request] Converted messages:",
					JSON.stringify(convertedMessages, null, 2),
				);

				// Stream graph execution
				const stream = langGraph.stream(currentUser.id, convertedMessages, {
					threadId: currentUser.id,
				});

				return streamSSE(c, async (sseStream) => {
					for await (const chunk of stream) {
						console.log("[Chat Stream] Chunk:", JSON.stringify(chunk, null, 2));

						// Chat Graph returns chunks with node names as keys
						// Extract the actual state from the node update
						const nodeUpdate = Object.values(chunk)[0] as any;

						if (!nodeUpdate) continue;

						// Extract messages from node update
						if (nodeUpdate.messages && nodeUpdate.messages.length > 0) {
							const lastMessage =
								nodeUpdate.messages[nodeUpdate.messages.length - 1];

							// Send message update
							await sseStream.writeSSE({
								data: JSON.stringify({
									type: "message",
									role: lastMessage.role,
									content: lastMessage.content,
									userContext: nodeUpdate.userContext,
								}),
							});
						}

						// Send user context updates
						if (nodeUpdate.userContext) {
							await sseStream.writeSSE({
								data: JSON.stringify({
									type: "context",
									userContext: nodeUpdate.userContext,
								}),
							});
						}
					}

					await sseStream.close();
				});
			} catch (error) {
				console.error("LangGraph chat error:", error);
				return c.json(
					{
						error: "Failed to process chat",
						message: error instanceof Error ? error.message : "Unknown error",
					},
					500,
				);
			}
		},
	)

	// Get user context (replaces old "phase" concept)
	.get("/context", async (c) => {
		const currentUser = c.var.user;
		const langGraph = c.var.langGraph;

		try {
			// Get current conversation state
			const result = await langGraph.getMessages(currentUser.id, {
				threadId: currentUser.id,
			});

			return c.json({
				userId: currentUser.id,
				userContext: result.userContext,
				messageCount: result.messages.length,
			});
		} catch (error) {
			console.error("Failed to get context:", error);
			return c.json(
				{
					error: "Failed to get user context",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	})

	// Get conversation history
	.get("/messages", async (c) => {
		const currentUser = c.var.user;
		const langGraph = c.var.langGraph;

		try {
			const result = await langGraph.getMessages(currentUser.id, {
				threadId: currentUser.id,
			});

			return c.json({
				threadId: result.threadId,
				messages: result.messages,
				userContext: result.userContext,
			});
		} catch (error) {
			console.error("Failed to get messages:", error);
			return c.json(
				{
					error: "Failed to get conversation history",
					message: error instanceof Error ? error.message : "Unknown error",
				},
				500,
			);
		}
	});
