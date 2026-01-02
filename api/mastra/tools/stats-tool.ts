import { createTool } from "@mastra/core";
import { z } from "zod";
import { db } from "../db";
import { AimLabsRepository } from "api/repository/aim-labs-repository";
import { KovaaksRepository } from "api/repository/kovaaks-repository";

export const getStats = createTool({
	id: "get-stats-tool",
	description:
		"Get aggregated statistics (p10, p25, p50, p75, p90, p99) for Aimlab and KovaaKs tasks. Use this to analyze player performance trends over time.",
	inputSchema: z.object({
		period: z.enum(["day", "week", "month"]).default("day"),
		game: z.enum(["Aimlab", "KovaaKs", "all"]).default("all"),
		limit: z.number().int().min(1).max(100).default(50),
		startDate: z.string().optional().describe("ISO date string (YYYY-MM-DD)"),
		endDate: z.string().optional().describe("ISO date string (YYYY-MM-DD)"),
	}),
	outputSchema: z.array(
		z.object({
			taskName: z.string(),
			date: z.string(),
			source: z.enum(["Aimlab", "KovaaKs"]),
			score: z.object({
				count: z.number(),
				p10: z.number(),
				p25: z.number(),
				p50: z.number(),
				p75: z.number(),
				p90: z.number(),
				p99: z.number(),
			}),
			accuracy: z.object({
				count: z.number(),
				p10: z.number(),
				p25: z.number(),
				p50: z.number(),
				p75: z.number(),
				p90: z.number(),
				p99: z.number(),
			}),
		}),
	),
	execute: async ({ context, runtimeContext }) => {
		const { period, game, startDate, endDate } = context;
		const userId = runtimeContext.get("userId") as string | null;

		if (!userId) {
			throw new Error("runtimeContext で userId を渡してください");
		}

		const start = startDate ? new Date(startDate) : undefined;
		const end = endDate ? new Date(endDate) : undefined;

		const aimRepo = new AimLabsRepository(db);
		const kovaaksRepo = new KovaaksRepository(db);

		const promises = [];

		if (game === "all" || game === "Aimlab") {
			promises.push(
				aimRepo
					.getTaskStatistics(userId, period, { startDate: start, endDate: end })
					.then((res) =>
						res.map((r) => ({ ...r, source: "Aimlab" as const })),
					),
			);
		} else {
			promises.push(Promise.resolve([]));
		}

		if (game === "all" || game === "KovaaKs") {
			promises.push(
				kovaaksRepo
					.getTaskStatistics(userId, period, { startDate: start, endDate: end })
					.then((res) =>
						res.map((r) => ({ ...r, source: "KovaaKs" as const })),
					),
			);
		} else {
			promises.push(Promise.resolve([]));
		}

		const [aimStats, kovaaksStats] = await Promise.all(promises);

		// Merge and Sort
		const mergedStats = [...aimStats, ...kovaaksStats].sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return a.taskName.localeCompare(b.taskName);
		});

		// Limit isn't strictly applied by repo for aggregated stats (it applies to raw rows usually, but getTaskStatistics aggregates ALL rows in range).
		// We can slice the *grouped* result if needed, but context.limit was passed.
		// Since repositories aggregate everything, `limit` might be better interpreted as "limit number of rows returned".
		if (context.limit) {
			return mergedStats.slice(0, context.limit);
		}

		return mergedStats;
	},
});
