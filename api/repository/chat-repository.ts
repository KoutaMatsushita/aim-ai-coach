import { chatMessages, chatThreads, type DBType } from "../db";
import { and, eq, sql } from "drizzle-orm";
import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

export class ChatRepository {
	constructor(private readonly db: DBType) {}

	async getThread(threadId: string, userId: string) {
		return this.db
			.select()
			.from(chatThreads)
			.where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
			.all();
	}

	async getMessages(threadId: string, userId: string) {
		return this.db
			.select({
				chatMessages: chatMessages,
			})
			.from(chatMessages)
			.innerJoin(chatThreads, eq(chatThreads.id, chatMessages.threadId))
			.where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
			.orderBy(chatMessages.createdAt)
			.all()
			.then((c) => c.flatMap((x) => x.chatMessages));
	}

	async getUIMessages(threadId: string, userId: string) {
		const messages = await this.getMessages(threadId, userId);

		return messages.map((msg) => {
			const parts =
				typeof msg.parts === "string" ? JSON.parse(msg.parts) : msg.parts;
			const metadata =
				typeof msg.metadata === "string"
					? JSON.parse(msg.metadata)
					: msg.metadata;
			return {
				...msg,
				role: msg.role as "user" | "assistant" | "system",
				parts: parts,
				metadata: metadata,
			} satisfies UIMessage;
		});
	}

	async sendMessage(userId: string, threadId: string, message: UIMessage) {
		const values = {
			id: message.id || nanoid(),
			threadId: threadId,
			role: message.role,
			parts: message.parts,
			metadata: message.metadata,
			userId: userId,
		};
		await this.db
			.insert(chatMessages)
			.values(values)
			.onConflictDoUpdate({
				target: chatMessages.id,
				set: {
					parts: values.parts,
					metadata: values.metadata,
					role: values.role,
				},
			})
			.execute();
	}

	async sendMessages(userId: string, threadId: string, messages: UIMessage[]) {
		const values = messages.map((message) => ({
			id: message.id || nanoid(),
			threadId: threadId,
			role: message.role,
			parts: message.parts,
			metadata: message.metadata,
			userId: userId,
		}));

		await this.db
			.insert(chatMessages)
			.values(values)
			.onConflictDoUpdate({
				target: chatMessages.id,
				set: {
					parts: sql`excluded.parts`,
					metadata: sql`excluded.metadata`,
					role: sql`excluded.role`,
				},
			})
			.execute();
	}
}
