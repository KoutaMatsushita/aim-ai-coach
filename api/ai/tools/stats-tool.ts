import { dayEnd, parse } from "@formkit/tempo";
import { tool } from "ai";
import { AimLabsRepository } from "api/repository/aim-labs-repository";
import { KovaaksRepository } from "api/repository/kovaaks-repository";
import { z } from "zod";

const InputSchema = z.object({
	userId: z.string().describe("User ID"),
	period: z.enum(["day", "week", "month"]).default("day"),
	game: z.enum(["Aimlab", "KovaaKs", "all"]).default("all"),
	limit: z.number().int().min(1).max(100).default(50),
	startDate: z.string().optional().describe("ISO date string (YYYY-MM-DD)"),
	endDate: z.string().optional().describe("ISO date string (YYYY-MM-DD)"),
});

export const createStatsTools = (
	aimlabsRepository: AimLabsRepository,
	kovaaksRepository: KovaaksRepository,
) => ({
	getStats: tool({
		description:
			"Get aggregated statistics (p10, p25, p50, p75, p90, p99) for Aimlab and KovaaKs tasks. Use this to analyze player performance trends over time.",
		inputSchema: InputSchema,
		execute: async (args) => {
			return await getStats(aimlabsRepository, kovaaksRepository, args);
		},
	}),
});

export const getStats = async (
	aimlabsRepository: AimLabsRepository,
	kovaaksRepository: KovaaksRepository,
	args: z.infer<typeof InputSchema>,
) => {
	const { userId, period, game, startDate, endDate, limit } = args;

	// Parse inputs using tempo (handles local time correctly)
	// startDate: 00:00:00 JST
	// endDate: 23:59:59.999 JST
	const start = startDate ? parse(startDate, "YYYY-MM-DD") : undefined;
	const end = endDate
		? dayEnd(parse(endDate, "YYYY-MM-DD"))
		: undefined;

	const promises = [];

	if (game === "all" || game === "Aimlab") {
		promises.push(
			aimlabsRepository
				.getTaskStatistics(userId, period, {
					startDate: start,
					endDate: end,
				})
				.then((res) => res.map((r) => ({ ...r, source: "Aimlab" as const }))),
		);
	} else {
		promises.push(Promise.resolve([]));
	}

	if (game === "all" || game === "KovaaKs") {
		promises.push(
			kovaaksRepository
				.getTaskStatistics(userId, period, {
					startDate: start,
					endDate: end,
				})
				.then((res) => res.map((r) => ({ ...r, source: "KovaaKs" as const }))),
		);
	} else {
		promises.push(Promise.resolve([]));
	}

	// @ts-ignore - TS might complain about array types but logic is correct
	const [aimStats, kovaaksStats] = await Promise.all(promises);

	// Merge and Sort
	const mergedStats = [...aimStats, ...kovaaksStats].sort((a, b) => {
		if (a.date !== b.date) return b.date.localeCompare(a.date);
		return a.taskName.localeCompare(b.taskName);
	});

	if (limit) {
		return mergedStats.slice(0, limit);
	}

	return mergedStats;
};
