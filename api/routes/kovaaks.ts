import { kovaaksScoresTable } from "api/db";
import type { Variables } from "api/variables";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

export const kovaaksApp = new Hono<{ Variables: Variables }>().post(
	"/",
	async (c) => {
		const data = await c.req.json();
		const dataArray = Array.isArray(data) ? data : [data];
		
		await c.var.db
			.insert(kovaaksScoresTable)
			.values(dataArray)
			.onConflictDoUpdate({
				target: [kovaaksScoresTable.sourceFilename, kovaaksScoresTable.timestamp],
				set: {
					score: sql`excluded.score`,
					sessionAccuracy: sql`excluded.session_accuracy`,
					meta: sql`excluded.meta`,
					// Update other fields if necessary, or just main ones
					accuracy: sql`excluded.accuracy`,
					damageDone: sql`excluded.damage_done`,
					hits: sql`excluded.hits`,
					shots: sql`excluded.shots`,
					killNumber: sql`excluded.kill_number`,
					// Add potentially changed fields due to parsing logic updates
				},
			});

		return c.json({ success: true, count: dataArray.length });
	},
);
