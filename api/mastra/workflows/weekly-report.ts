import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { UserSelectSchema } from "../db";
import { findStats, findUser } from "./steps.ts";

const callLLM = createStep({
	id: "callLLM",
	inputSchema: z.object({
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
	outputSchema: z.object({
		message: z.string(),
	}),
	execute: async ({ inputData, runtimeContext, mastra }) => {
		const { days, user, stats } = inputData;

		const agent = mastra.getAgent("weeklyReportWorkflow");
		const message = await agent.generate(
			`
        直近 ${days} 日間のプレイ統計情報（パーセンタイル統計）に基づき、ウィークリーレポートを作成してください。
        
        統計データ:
        ${JSON.stringify(stats, null, 2)}
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
	.then(findStats)
	.then(callLLM)
	.commit();
