import { zValidator } from "@hono/zod-validator";
import type { MessageListInput } from "@mastra/core/agent/message-list";
import { RuntimeContext } from "@mastra/core/di";
import { Hono } from "hono";
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
				format: "aisdk",
				memory: {
					resource: currentUser.id,
					thread: currentUser.id,
				},
				runtimeContext: new RuntimeContext([["userId", currentUser.id]]),
			});

			return result.toUIMessageStreamResponse();
		},
	);
