import { kovaaksScoresTable } from "api/mastra/db";
import type { Variables } from "api/variables";
import { Hono } from "hono";

export const kovaaksApp = new Hono<{ Variables: Variables }>().post(
	"/",
	async (c) => {
		const data = await c.req.json();
		const dataArray = Array.isArray(data) ? data : [data];
		await c.var.db.insert(kovaaksScoresTable).values(dataArray);
		return c.json({ success: true, count: dataArray.length });
	},
);
