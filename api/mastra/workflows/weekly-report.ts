import { addDay } from "@formkit/tempo";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { AimLabsRepository } from "../../repository/aim-labs-repository.ts";
import { KovaaksRepository } from "../../repository/kovaaks-repository.ts";
import type { taskFilter } from "../../repository/task-filter.ts";
import {
	AimlabTaskSelectSchema,
	db,
	KovaaksScoreInsertSchema,
	UserSelectSchema,
} from "../db";
import { findScores, findUser } from "./steps.ts";

const callLLM = createStep({
	id: "callLLM",
	inputSchema: z.object({
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
	outputSchema: z.object({
		message: z.string(),
	}),
	execute: async ({ inputData, runtimeContext, mastra }) => {
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

		const agent = mastra.getAgent("weeklyReportWorkflow");
		const message = await agent.generate(
			`
        下記の直近 ${days} 日のスコアを解析して、ウィークリーリポートを生成する。
        aimlabsScore: ${JSON.stringify(aimLabsScores)}
        kovaaksScores: ${JSON.stringify(kovaaksScores)}
        `,
			{
				memory: {
					thread: user.id,
					resource: user.id,
					readOnly: true,
				},
				runtimeContext,
			},
		);

		return {
			message: message.text,
		};
	},
});

export const weeklyReportWorkflow = createWorkflow({
	id: "weekly-report-workflow",
	inputSchema: z.object({
		days: z.number(),
	}),
	outputSchema: z.object({
		message: z.string(),
	}),
})
	.then(findUser)
	.then(findScores)
	.then(callLLM)
	.commit();
