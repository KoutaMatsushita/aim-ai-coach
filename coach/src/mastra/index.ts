import {Mastra} from '@mastra/core/mastra';
import {PinoLogger} from '@mastra/loggers';
import {storage} from "./stores";
import {registerApiRoute} from "@mastra/core/server";
import {
    AimlabTaskInsertSchema, aimlabTaskTable,
    db,
    DiscordUserInsertSchema,
    discordUsersTable,
    KovaaksScoreInsertSchema,
    kovaaksScoresTable
} from "../db/schema";
import {eq} from "drizzle-orm";
import {z} from "zod";
import {aimAiCoachAgent} from "./agents/aim-ai-coach-agent";

export const mastra = new Mastra({
    agents: {aimAiCoachAgent},
    storage: storage,
    logger: new PinoLogger({
        name: 'Mastra',
        level: 'info',
    }),
    server: {
        apiRoutes: [
            registerApiRoute("/users", {
                method: "POST",
                handler: async c => {
                    const result = DiscordUserInsertSchema.safeParse(await c.req.json())
                    if (!result.success) {
                        return c.json(result.error, 400)
                    }

                    return c.json(
                        await db.insert(discordUsersTable)
                            .values(result.data)
                            .onConflictDoNothing()
                            .returning()
                    )
                },
            }),
            registerApiRoute("/users/:userId/kovaaks", {
                method: "POST",
                handler: async c => {
                    const userId = c.req.param("userId")
                    const user = await db.query.discordUsersTable.findFirst({where: eq(discordUsersTable.id, userId)})
                    if (!user) return c.json({ "error": "user not found" }, 404)

                    const result = z.array(KovaaksScoreInsertSchema).safeParse(await c.req.json())
                    if (!result.success) {
                        return c.json(result.error, 400)
                    }

                    return c.json(
                        await db.insert(kovaaksScoresTable)
                        .values(result.data)
                        .onConflictDoNothing()
                        .returning()
                    )
                },
            }),
            registerApiRoute("/users/:userId/aimlab", {
                method: "POST",
                handler: async c => {
                    const userId = c.req.param("userId")
                    const user = await db.query.discordUsersTable.findFirst({where: eq(discordUsersTable.id, userId)})
                    if (!user) return c.json({ "error": "user not found" }, 404)

                    const result = z.array(AimlabTaskInsertSchema).safeParse(await c.req.json())
                    if (!result.success) {
                        return c.json(result.error, 400)
                    }

                    return c.json(
                        await db.insert(aimlabTaskTable)
                            .values(result.data)
                            .onConflictDoNothing()
                            .returning()
                    )
                },
            }),
        ],
    },
});
