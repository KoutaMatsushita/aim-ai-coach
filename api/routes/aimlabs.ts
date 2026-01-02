import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { aimlabTaskTable } from "../mastra/db";
import { requireUser } from "../middleware/require-user";
import type { Variables } from "../variables";

export const aimlabsApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.post("/", async (c) => {
		const data = await c.req.json();
		const userId = c.var.user.id;
		const dataWithUserId = Array.isArray(data)
			? data.map((record) => ({ ...record, userId }))
			: [{ ...data, userId }];
		await c.var.db
			.insert(aimlabTaskTable)
			.values(dataWithUserId)
			.onConflictDoUpdate({
				target: aimlabTaskTable.taskId,
				set: {
					klutchId: sql`excluded.klutchId`,
					createDate: sql`excluded.createDate`,
					taskName: sql`excluded.taskName`,
					score: sql`excluded.score`,
					mode: sql`excluded.mode`,
					aimlabMap: sql`excluded.aimlab_map`,
					aimlabVersion: sql`excluded.aimlab_version`,
					weaponType: sql`excluded.weaponType`,
					weaponName: sql`excluded.weaponName`,
					performanceClass: sql`excluded.performanceClass`,
					workshopId: sql`excluded.workshopId`,
					performance: sql`excluded.performance`,
					playId: sql`excluded.playId`,
					startedAt: sql`excluded.startedAt`,
					endedAt: sql`excluded.endedAt`,
					hasReplay: sql`excluded.hasReplay`,
					weaponSkin: sql`excluded.weaponSkin`,
					appId: sql`excluded.appId`,
				},
			});
		return c.json({ success: true, count: dataWithUserId.length });
	});
