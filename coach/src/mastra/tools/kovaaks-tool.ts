import { createTool } from "@mastra/core/tools";
import { sql } from "drizzle-orm";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";
import { db, kovaaksScoresTable } from "../../db/schema";

const {
	createInsertSchema: createInsertSchemaCoerce,
	createSelectSchema: createSelectSchemaCoerce,
} = createSchemaFactory({
	coerce: { date: true },
});

export const insertKovaaksTool = createTool({
	id: "insert-kovaaks-tool",
	description: "insert kovaaks score",
	inputSchema: createInsertSchemaCoerce(kovaaksScoresTable),
	outputSchema: z.array(createSelectSchemaCoerce(kovaaksScoresTable)),
	execute: async ({ context }) => {
		return db.insert(kovaaksScoresTable).values(context).onConflictDoNothing().returning();
	},
});

export const selectKovaaksTool = createTool({
	id: "select-kovaaks-tool",
	description: "select kovaaks score",
	inputSchema: z.object({
		limit: z.number().min(1).max(1000).default(100),
		dateRange: z.object({
			from: z.date().default(() => new Date()),
			to: z.date().default(() => new Date()),
		}),
	}),
	outputSchema: z.array(createSelectSchemaCoerce(kovaaksScoresTable)),
	execute: async ({ context }) => {
		return db
			.select()
			.from(kovaaksScoresTable)
			.where(
				sql`${kovaaksScoresTable.runDatetimeText} BETWEEN ${context.dateRange.from} AND ${context.dateRange.to}`
			)
			.limit(context.limit);
	},
});
