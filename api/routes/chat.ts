import { zValidator } from "@hono/zod-validator";
import { toAISdkFormat } from "@mastra/ai-sdk";
import type { MessageListInput } from "@mastra/core/agent/message-list";
import { RuntimeContext } from "@mastra/core/di";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
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
				messages: z.union([
					z.string(),
					z.array(z.string()),
					z.record(z.any(), z.any()).transform((v) => v as MessageListInput),
					z.array(
						z.record(z.any(), z.any()).transform((v) => v as MessageListInput),
					),
				]),
			}),
		),
		async (c) => {
			const currentUser = c.var.user;
			const { messages } = await c.req.json();

			const agentId = "aimAiCoachAgent";
			const agentObj = c.var.mastra.getAgent(agentId);

			const result = await agentObj.stream(messages, {
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
