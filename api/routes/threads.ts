import { Hono } from "hono";
import { requireUser } from "../middleware/require-user";
import type { Variables } from "../variables";
import { db } from "../ai/db";
import { chatThreads } from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createAimAiCoachAgent } from "../ai/agents/aim-ai-coach-agent.ts";
import { UserRepository } from "../repository/user-repository.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AimLabsRepository } from "../repository/aim-labs-repository.ts";
import { KovaaksRepository } from "../repository/kovaaks-repository.ts";
import { ChatRepository } from "../repository/chat-repository.ts";
import { convertToModelMessages, pruneMessages, smoothStream } from "ai";

export const threadApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post("/", async (c) => {
		const userId = c.var.user.id;

		const thread = await db
			.insert(chatThreads)
			.values({
				id: nanoid(),
				userId,
				title: "New Chat",
			})
			.returning();

		return c.json(thread);
	})
	.get("/:threadId", async (c) => {
		const threadId = c.req.param("threadId");
		const userId = c.var.user.id;

		const thread = await db.query.chatThreads.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, threadId), eq(t.userId, userId)),
		});

		if (thread) {
			return c.json(thread);
		} else {
			const newThread = await db
				.insert(chatThreads)
				.values({
					id: threadId,
					userId,
					title: "New Chat",
				})
				.returning();

			return c.json(newThread[0]);
		}
	})
	.delete("/:threadId", async (c) => {
		const threadId = c.req.param("threadId");
		const userId = c.var.user.id;

		// Verify ownership
		const thread = await db.query.chatThreads.findFirst({
			where: (t, { and, eq }) => and(eq(t.id, threadId), eq(t.userId, userId)),
		});

		if (!thread) {
			return c.json({ error: "Thread not found" }, 404);
		}

		await db.delete(chatThreads).where(eq(chatThreads.id, threadId));
		return c.body(null, 204);
	})
	.get("/:threadId/messages", async (c) => {
		const threadId = c.req.param("threadId");
		const userId = c.var.user.id;

		const chatRepository = new ChatRepository(c.var.db);

		// Verify ownership (optional but good practice)
		const thread = await chatRepository.getThread(threadId, userId);

		if (!thread) {
			return c.json({ error: "Thread not found" }, 404);
		}

		const messages = await chatRepository.getUIMessages(threadId, userId);

		return c.json(messages);
	})
	.post(
		"/:threadId/chat",
		zValidator(
			"json",
			z.object({
				id: z.string(),
				messages: z.array(
					z.object({
						id: z.string(),
						role: z.enum(["system", "user", "assistant"]),
						metadata: z.any().nullish(),
						parts: z.array(z.any()),
					}),
				),
			}),
		),
		async (c) => {
			const threadId = c.req.param("threadId");
			const userId = c.var.user.id;
			const { messages } = c.req.valid("json");

			const aimAiAgent = createAimAiCoachAgent(
				new UserRepository(c.var.db),
				new AimLabsRepository(c.var.db),
				new KovaaksRepository(c.var.db),
			);

			const chatRepository = new ChatRepository(c.var.db);
			const stream = await aimAiAgent.stream({
				messages: pruneMessages({
					messages: await convertToModelMessages(messages),
					reasoning: "before-last-message",
					toolCalls: "before-last-message",
					emptyMessages: "remove",
				}),
				options: {
					userId: userId,
					threadId: threadId,
				},
				experimental_transform: smoothStream(),
			});

			return stream.toUIMessageStreamResponse({
				originalMessages: messages,
				onFinish: async ({ messages }) => {
					await chatRepository.sendMessages(userId, threadId, messages);
				},
			});
		},
	);
