import { Hono } from "hono";
import type { Variables } from "./variables";
import { aimlabTaskTable } from "./mastra/db";
import { requireUser } from "./middleware/require-user";

export const aimlabsApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post("/", async (c) => {
		const data = await c.req.json();
		const userId = c.var.user.id;
		const dataWithUserId = Array.isArray(data)
			? data.map((record) => ({ ...record, userId }))
			: [{ ...data, userId }];
		await c.var.db.insert(aimlabTaskTable).values(dataWithUserId);
		return c.json({ success: true, count: dataWithUserId.length });
	})
