import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	AimlabTaskInsertSchema,
	aimlabTaskTable,
	DiscordUserInsertSchema,
	db,
	discordUsersTable,
	KovaaksScoreInsertSchema,
	kovaaksScoresTable,
} from "../db/schema";
import { aimAiCoachAgent } from "./agents/aim-ai-coach-agent";
import { storage } from "./stores";

export const mastra = new Mastra({
	agents: { aimAiCoachAgent },
	storage: storage,
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	server: {
		apiRoutes: [
			registerApiRoute("/users", {
				method: "POST",
				handler: async (c) => {
					const result = DiscordUserInsertSchema.safeParse(await c.req.json());
					if (!result.success) {
						return c.json(result.error, 400);
					}

					return c.json(
						await db.insert(discordUsersTable).values(result.data).onConflictDoNothing().returning()
					);
				},
			}),
			registerApiRoute("/users/:userId/kovaaks", {
				method: "POST",
				handler: async (c) => {
					const userId = c.req.param("userId");
					const user = await db.query.discordUsersTable.findFirst({
						where: eq(discordUsersTable.id, userId),
					});
					if (!user) return c.json({ error: "user not found" }, 404);

					const result = z.array(KovaaksScoreInsertSchema).safeParse(await c.req.json());
					if (!result.success) {
						return c.json(result.error, 400);
					}

					return c.json(
						await db
							.insert(kovaaksScoresTable)
							.values(result.data)
							.onConflictDoNothing()
							.returning()
					);
				},
			}),
			registerApiRoute("/users/:userId/aimlab", {
				method: "POST",
				handler: async (c) => {
					const userId = c.req.param("userId");
					const user = await db.query.discordUsersTable.findFirst({
						where: eq(discordUsersTable.id, userId),
					});
					if (!user) return c.json({ error: "user not found" }, 404);

					const result = z.array(AimlabTaskInsertSchema).safeParse(await c.req.json());
					if (!result.success) {
						return c.json(result.error, 400);
					}

					return c.json(
						await db.insert(aimlabTaskTable).values(result.data).onConflictDoNothing().returning()
					);
				},
			}),
		],
	},
});
