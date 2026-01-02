import { addDay } from "@formkit/tempo";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { AimLabsRepository } from "../../repository/aim-labs-repository.ts";
import { KovaaksRepository } from "../../repository/kovaaks-repository.ts";
import type { taskFilter } from "../../repository/task-filter.ts";
import { UserRepository } from "../../repository/user-repository.ts";
import {
	AimlabTaskSelectSchema,
	db,
	KovaaksScoreInsertSchema,
	UserSelectSchema,
} from "../db";

export const findUser = createStep({
	id: "findUser",
	inputSchema: z.object({
		days: z.number(),
	}),
	outputSchema: z.object({
		days: z.number(),
		user: UserSelectSchema,
	}),
	execute: async ({ inputData, runtimeContext }) => {
		const { days } = inputData;
		const userId = runtimeContext.get("userId") as string | null;
		if (!userId) throw Error("User ID not found.");

		const repository = new UserRepository(db);
		const user = await repository.findById(userId);
		if (!user) throw Error("User ID not found.");

		return {
			days,
			user,
		};
	},
});

export const findScores = createStep({
	id: "findScores",
	inputSchema: z.object({
		days: z.number(),
		user: UserSelectSchema,
	}),
	outputSchema: z.object({
		days: z.number(),
		user: UserSelectSchema,
		aimLabsScores: z.object({
			data: z.array(AimlabTaskSelectSchema),
			total: z.number(),
		}),
		kovaaksScores: z.object({
			data: z.array(KovaaksScoreInsertSchema),
			total: z.number(),
		}),
	}),
	execute: async ({ inputData }) => {
		const { days, user } = inputData;

		const aimLabsRepository = new AimLabsRepository(db);
		const kovaaksRepository = new KovaaksRepository(db);

		const filter: taskFilter = {
			startDate: addDay(new Date(), -days),
			endDate: addDay(new Date()),
		};

		const [aimLabsScores, kovaaksScores] = await Promise.all([
			await aimLabsRepository.findTasksByUserId(user.id, filter),
			await kovaaksRepository.findTasksByUserId(user.id, filter),
		]);

		return {
			days,
			user,
			aimLabsScores,
			kovaaksScores,
		};
	},
});

export const findStats = createStep({
	id: "findStats",
	inputSchema: z.object({
		days: z.number(),
		user: UserSelectSchema,
	}),
	outputSchema: z.object({
		days: z.number(),
		user: UserSelectSchema,
		stats: z.array(
			z.object({
				taskName: z.string(),
				date: z.string(),
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
				source: z.enum(["Aimlab", "KovaaKs"]),
			}),
		),
	}),
	execute: async ({ inputData }) => {
		const { days, user } = inputData;

		const aimRepo = new AimLabsRepository(db);
		const kovaaksRepo = new KovaaksRepository(db);

		const startDate = addDay(new Date(), -days);
		const endDate = addDay(new Date());

		const [aimStats, kovaaksStats] = await Promise.all([
			aimRepo.getTaskStatistics(user.id, "day", { startDate, endDate }),
			kovaaksRepo.getTaskStatistics(user.id, "day", { startDate, endDate }),
		]);

		const mergedStats = [
			...aimStats.map((s) => ({ ...s, source: "Aimlab" as const })),
			...kovaaksStats.map((s) => ({ ...s, source: "KovaaKs" as const })),
		].sort((a, b) => {
			if (a.date !== b.date) return b.date.localeCompare(a.date);
			return a.taskName.localeCompare(b.taskName);
		});

		return {
			days,
			user,
			stats: mergedStats,
		};
	},
});
