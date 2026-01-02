import { Hono } from "hono";
import { AimLabsRepository } from "../repository/aim-labs-repository";
import type { Variables } from "../variables";
import { requireUser } from "../middleware/require-user";

export const statsApp = new Hono<{ Variables: Variables }>()
	.use("*", requireUser)
	.get("/", async (c) => {
		const userId = c.var.user.id;
		const query = c.req.query();
		const period = (query.period || "day") as "day" | "week" | "month";
		
		const startDate = query.startDate ? new Date(query.startDate) : undefined;
		const endDate = query.endDate ? new Date(query.endDate) : undefined;

		const repo = new AimLabsRepository(c.var.db);
		const stats = await repo.getTaskStatistics(userId, period, {
			startDate,
			endDate,
		});

		return c.json({
			data: stats,
		});
	});
