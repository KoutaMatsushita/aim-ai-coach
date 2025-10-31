import { zValidator } from "@hono/zod-validator";
import { toAISdkFormat } from "@mastra/ai-sdk";
import { RuntimeContext } from "@mastra/core/di";
import {
	convertToModelMessages,
	createUIMessageStream,
	pruneMessages,
	type UIMessage,
} from "ai";
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
						metadata: z
							.object({
								createdAt: z.string(),
							})
							.optional(),
						parts: z.array(z.any()),
					}),
				),
				trigger: z.string().optional(),
			}),
		),
		async (c) => {
			const currentUser = c.var.user;
			const { messages } = await c.req.json<{ messages: UIMessage[] }>();

			const agentId = "aimAiCoachAgent";
			const agentObj = c.var.mastra.getAgent(agentId);

			const prunedMessages = pruneMessages({
				messages: convertToModelMessages(messages),
				reasoning: "before-last-message",
				toolCalls: "before-last-2-messages",
				emptyMessages: "remove",
			});

			const result = await agentObj.stream(prunedMessages, {
				memory: {
					resource: currentUser.id,
					thread: currentUser.id,
				},
				runtimeContext: new RuntimeContext([["userId", currentUser.id]]),
			});

			const uiMessageStream = createUIMessageStream({
				execute: async ({ writer }) => {
					for await (const part of toAISdkFormat(result, { from: "agent" })!) {
						await writer.write(part);
					}
				},
			});

			return streamSSE(c, async (stream) => {
				for await (const part of uiMessageStream) {
					await stream.writeSSE({ data: JSON.stringify(part) });
				}
				await stream.close();
			});
		},
	);
