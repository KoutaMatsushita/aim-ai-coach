import { Mastra } from "@mastra/core/mastra";
import { registerApiRoute } from "@mastra/core/server";
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
import {logger} from "../logger";

export const mastra = new Mastra({
	agents: { aimAiCoachAgent },
	storage: storage,
	logger: logger,
	server: {
		apiRoutes: [
			registerApiRoute("/users", {
				method: "POST",
				handler: async (c) => {
                    try {
                        const result = DiscordUserInsertSchema.safeParse(await c.req.json());
                        if (!result.success) {
                            return c.json(result.error, 400);
                        }

                        return c.json(
                            await db.insert(discordUsersTable).values(result.data).onConflictDoNothing().returning()
                        );
                    } catch (e) {
                        if (e instanceof Error) {
                            logger.error("error", e)
                            return c.json(e, 500)
                        } else {
                            logger.error(`error: ${JSON.stringify(e)}`)
                            return c.json({ error: "unknown error" }, 500)
                        }
                    }
				},
			}),
			registerApiRoute("/users/:userId/kovaaks", {
				method: "POST",
				handler: async (c) => {
                    try {
                        const userId = c.req.param("userId");
                        const user = await db.query.discordUsersTable.findFirst({
                            where: eq(discordUsersTable.id, userId),
                        });
                        if (!user) return c.json({error: "user not found"}, 404);

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
                    } catch (e) {
                        if (e instanceof Error) {
                            logger.error("error", e)
                            return c.json(e, 500)
                        } else {
                            logger.error(`error: ${JSON.stringify(e)}`)
                            return c.json({ error: "unknown error" }, 500)
                        }
                    }
				},
			}),
			registerApiRoute("/users/:userId/aimlab", {
				method: "POST",
				handler: async (c) => {
                    try {
                        const userId = c.req.param("userId");
                        const user = await db.query.discordUsersTable.findFirst({
                            where: eq(discordUsersTable.id, userId),
                        });
                        if (!user) return c.json({error: "user not found"}, 404);

                        const result = z.array(AimlabTaskInsertSchema.extend({
                            startedAt: z.coerce.date(),
                            endedAt: z.coerce.date(),
                        })).safeParse(await c.req.json());
                        if (!result.success) {
                            return c.json(result.error, 400);
                        }

                        return c.json(
                            await db.insert(aimlabTaskTable).values(result.data).onConflictDoNothing().returning()
                        );
                    } catch (e) {
                        if (e instanceof Error) {
                            logger.error("error", e)
                            return c.json(e, 500)
                        } else {
                            logger.error(`error: ${JSON.stringify(e)}`)
                            return c.json({ error: "unknown error" }, 500)
                        }
                    }
				},
			}),
		],
	},
});
