import { Hono } from "hono";
import { AimLabsRepository } from "../repository/aim-labs-repository";
import { KovaaksRepository } from "../repository/kovaaks-repository";
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

		const aimRepo = new AimLabsRepository(c.var.db);
		const kovaaksRepo = new KovaaksRepository(c.var.db);

		const [aimStats, kovaaksStats] = await Promise.all([
			aimRepo.getTaskStatistics(userId, period, { startDate, endDate }),
			kovaaksRepo.getTaskStatistics(userId, period, { startDate, endDate }),
		]);

		const mergedStats = [
			...aimStats.map((s) => ({ ...s, source: "Aimlab" as const })),
			...kovaaksStats.map((s) => ({ ...s, source: "KovaaKs" as const })),
		].sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return a.taskName.localeCompare(b.taskName);
		});

		return c.json({
			data: mergedStats,
		});
	});
