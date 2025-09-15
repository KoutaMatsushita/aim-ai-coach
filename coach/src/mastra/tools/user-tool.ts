import {createTool} from "@mastra/core";
import {aimlabTaskTable, db, discordUsersTable, kovaaksScoresTable} from "../../db/schema";
import {z} from "zod";
import {createInsertSchema, createSelectSchema} from "drizzle-zod";
import {eq} from "drizzle-orm";

export const findKovaaksScoresByDiscordId = createTool({
    id: 'find-kovaaks-scores-by-discord-user-id-tool',
    description: 'find kovaaks scores by Discord user id',
    inputSchema: z.object({
        userId: z.string(),
        limit: z.number().int().min(1).max(100).default(100),
        offset: z.number().int().min(0).default(0),
        after: z.coerce.date().optional(),
    }),
    outputSchema: z.array(createSelectSchema(kovaaksScoresTable)),
    execute: async ({context}) => {
        return db.query.kovaaksScoresTable.findMany({
            where: (t, {and, eq, gte}) => and(
                eq(t.discordUserId, context.userId),
                context.after ? gte(t.runEpochSec, context.after) : undefined,
            ),
            limit: context.limit,
            offset: context.offset,
        })
    },
})

export const findAimlabTasksByDiscordId = createTool({
    id: 'find-aimlab-tasks-by-discord-user-id-tool',
    description: 'find aimlab tasks by Discord user id',
    inputSchema: z.object({
        userId: z.string(),
        limit: z.number().int().min(1).max(100).default(100),
        offset: z.number().int().min(0).default(0),
        after: z.coerce.date().optional(),
    }),
    outputSchema: z.array(createSelectSchema(aimlabTaskTable)),
    execute: async ({context}) => {
        return db.query.aimlabTaskTable.findMany({
            where: (t, { and, eq, gte }) => and(
                eq(t.discordUserId, context.userId),
                context.after ? gte(t.startedAt, context.after) : undefined,
            ),
            limit: context.limit,
            offset: context.offset,
        })
    },
})

export const deleteUserTool = createTool({
    id: 'delete-user-tool',
    description: 'delete discord user',
    inputSchema: createInsertSchema(discordUsersTable),
    execute: async ({context}) => {
        const user = await db.query.discordUsersTable
            .findFirst({where: (t, {eq}) => eq(t.id, context.id)})

        if (!user) throw new Error("user is not found")

        await db.transaction(async (tx) => {
            await tx.delete(kovaaksScoresTable).where(eq(kovaaksScoresTable.discordUserId, user.id))
            await tx.delete(aimlabTaskTable).where(eq(aimlabTaskTable.discordUserId, user.id))
        })
    },
})
